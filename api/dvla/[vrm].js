// api/dvla/[vrm].js
export const config = {
  runtime: "nodejs",
};

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

// --- helpers ---
function cleanVrm(v) {
  return String(v || "").replace(/\s+/g, "").toUpperCase();
}

// DVSA often returns dates like "2014.11.02" -> convert to "2014-11-02"
function dvsaDateToIso(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s.replaceAll(".", "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s; // leave as-is if unknown format
}

// Fallback estimate if no exact date is available
function estimateMotExpiryDateFromDvla(dvla) {
  if (dvla?.motExpiryDate) return { date: dvla.motExpiryDate, estimated: false };

  const mor = dvla?.monthOfFirstRegistration; // e.g. "2017-06"
  if (!mor || !/^\d{4}-\d{2}$/.test(mor)) return { date: null, estimated: false };

  const [y, m] = mor.split("-").map(Number);
  const estYear = y + 3;
  const estMonth = m;

  const lastDay = new Date(estYear, estMonth, 0);
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
  const dd = String(lastDay.getDate()).padStart(2, "0");

  return { date: `${yyyy}-${mm}-${dd}`, estimated: true };
}

// Fetch an OAuth token for DVSA (client_credentials)
async function getDvsaToken() {
  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE_URL;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error("DVSA OAuth env missing (DVSA_TOKEN_URL / DVSA_CLIENT_ID / DVSA_CLIENT_SECRET / DVSA_SCOPE_URL)");
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

  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}

  if (!r.ok) {
    throw new Error(`DVSA token failed: ${r.status} ${t}`);
  }

  const token = j?.access_token;
  if (!token) throw new Error("DVSA token missing access_token");
  return token;
}

// Call DVSA MOT History and return an exact expiry date if possible
async function fetchDvsaMotExpiry(vrm) {
  const baseUrl = process.env.DVSA_BASE_URL || "https://tapi.dvsa.gov.uk";
  const apiKey = process.env.DVSA_API_KEY;

  if (!apiKey) throw new Error("DVSA_API_KEY missing in env");

  const token = await getDvsaToken();

  const url = `${baseUrl.replace(/\/+$/, "")}/trade/vehicles/mot-tests?registration=${encodeURIComponent(vrm)}`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": apiKey,

      // Some versions expect this style; harmless if not required
      Accept: "application/json",
    },
  });

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }

  if (!r.ok) {
    // bubble up useful debug (but keep it short)
    throw new Error(`DVSA MOT failed: ${r.status} ${text?.slice(0, 200)}`);
  }

  // DVSA typically returns an array of vehicles
  const vehicle = Array.isArray(data) ? data[0] : data;
  const motTests = vehicle?.motTests || vehicle?.motTestHistory || [];

  if (!Array.isArray(motTests) || motTests.length === 0) return null;

  // Pick the best candidate expiry:
  // - expiryDate exists on PASSED tests in the old API docs
  // - New API still follows a similar structure
  const candidates = motTests
    .map((t) => ({
      expiry: dvsaDateToIso(t?.expiryDate),
      completed: String(t?.completedDate || "").trim(),
      result: String(t?.testResult || "").toUpperCase(),
    }))
    .filter((x) => x.expiry);

  if (!candidates.length) return null;

  // Sort by completedDate (rough) then take the latest expiry we have
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

    const dvlaKey = process.env.DVLA_API_KEY;
    if (!dvlaKey) return res.status(500).json({ error: "DVLA_API_KEY missing in Vercel env" });

    const vrmRaw =
      (req.query && (req.query.vrm || req.query.registrationNumber)) ||
      String(req.url || "").split("/").pop();

    const vrm = cleanVrm(vrmRaw);
    if (!vrm) return res.status(400).json({ error: "VRM required" });

    // 1) DVLA Vehicle Enquiry (make/model/tax/etc)
    const dvlaRes = await fetch(DVLA_URL, {
      method: "POST",
      headers: {
        "x-api-key": dvlaKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registrationNumber: vrm }),
    });

    const dvlaText = await dvlaRes.text();
    let dvlaData;
    try { dvlaData = JSON.parse(dvlaText); } catch { dvlaData = { raw: dvlaText }; }

    if (!dvlaRes.ok) {
      return res.status(dvlaRes.status).json({
        error: "DVLA request failed",
        status: dvlaRes.status,
        details: dvlaData,
      });
    }

    // 2) DVSA MOT History (exact expiry)
    let dvsaExact = null;
    let dvsaError = null;

    try {
      dvsaExact = await fetchDvsaMotExpiry(vrm);
    } catch (e) {
      dvsaError = String(e?.message || e);
    }

    // 3) Final MOT expiry logic
    const fallback = estimateMotExpiryDateFromDvla(dvlaData);

    const finalMotExpiry =
      dvsaExact ||
      dvlaData?.motExpiryDate ||
      fallback.date ||
      null;

    const estimated =
      !!fallback.estimated && !dvsaExact && !dvlaData?.motExpiryDate;

    return res.status(200).json({
      ...dvlaData,

      // convenience alias
      model: dvlaData.model ?? dvlaData.vehicleModel ?? null,

      // ✅ frontend uses this
      motExpiryDate: finalMotExpiry,
      motExpiryEstimated: estimated,

      // ✅ useful debug while testing (safe to keep)
      motExpirySource: dvsaExact
        ? "DVSA_MOT_HISTORY"
        : dvlaData?.motExpiryDate
        ? "DVLA"
        : fallback.date
        ? "ESTIMATE_3Y_EOM"
        : "UNKNOWN",
      motHistoryError: dvsaError, // null if ok
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}