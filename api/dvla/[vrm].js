// api/dvla/[vrm].js
//
// MOT History API only (VES API disabled)
// To re-enable VES, set USE_VES_API = true and add back the VES fetch logic
//
export const config = {
  runtime: "nodejs",
};

const USE_VES_API = false; // Set to true to re-enable VES API

function cleanVrm(v) {
  return String(v || "").replace(/\s+/g, "").toUpperCase();
}

// DVSA often uses "YYYY.MM.DD" -> convert to "YYYY-MM-DD"
function dvsaDateToIso(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s.replaceAll(".", "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

async function getDvsaToken() {
  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE_URL;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error(
      "Missing DVSA OAuth env (DVSA_TOKEN_URL / DVSA_CLIENT_ID / DVSA_CLIENT_SECRET / DVSA_SCOPE_URL)"
    );
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "client_credentials");
  body.set("scope", scope);

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await r.text();
  let j = {};
  try {
    j = JSON.parse(text);
  } catch {}

  if (!r.ok) {
    throw new Error(`DVSA token failed: ${r.status} ${text?.slice(0, 200)}`);
  }

  if (!j?.access_token) throw new Error("DVSA token missing access_token");
  return j.access_token;
}

async function fetchDvsaExactMotExpiry(vrm) {
  const baseUrl = (process.env.DVSA_BASE_URL || "https://tapi.dvsa.gov.uk").replace(/\/+$/, "");
  const apiKey = process.env.DVSA_API_KEY;

  if (!apiKey) throw new Error("DVSA_API_KEY missing in env");

  const token = await getDvsaToken();
  const url = `${baseUrl}/trade/vehicles/mot-tests?registration=${encodeURIComponent(vrm)}`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  const text = await r.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}

  if (!r.ok) {
    throw new Error(`DVSA MOT failed: ${r.status} ${text?.slice(0, 200)}`);
  }

  // Usually an array of vehicles
  const vehicle = Array.isArray(data) ? data[0] : data;
  const motTests = vehicle?.motTests || [];

  if (!Array.isArray(motTests) || motTests.length === 0) return null;

  // Grab latest expiryDate we can find
  const candidates = motTests
    .map((t) => ({
      expiry: dvsaDateToIso(t?.expiryDate),
      completed: String(t?.completedDate || "").trim(),
    }))
    .filter((x) => x.expiry);

  if (!candidates.length) return null;

  candidates.sort((a, b) => (a.completed > b.completed ? -1 : a.completed < b.completed ? 1 : 0));
  return candidates[0].expiry;
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const vrmRaw =
      (req.query && (req.query.vrm || req.query.registrationNumber)) ||
      String(req.url || "").split("/").pop();

    const vrm = cleanVrm(vrmRaw);
    if (!vrm) return res.status(400).json({ error: "VRM required" });

    let motExpiryDate = null;
    let motHistoryError = null;

    try {
      motExpiryDate = await fetchDvsaExactMotExpiry(vrm);
    } catch (e) {
      motHistoryError = String(e?.message || e);
    }

    return res.status(200).json({
      registrationNumber: vrm,
      motExpiryDate: motExpiryDate || null,
      motExpiryEstimated: false, // never estimate in this DVSA-only test
      motExpirySource: motExpiryDate ? "DVSA_MOT_HISTORY_ONLY" : "DVSA_NO_EXPIRY",
      motHistoryError, // null if OK
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}