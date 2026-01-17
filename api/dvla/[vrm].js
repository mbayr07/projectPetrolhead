// api/dvla/[vrm].js
export const config = {
  runtime: "nodejs",
};

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

// ---------------------------
// MOT History (DVSA) helpers
// ---------------------------

// cache the access token in memory (works well on Vercel warm lambdas)
let _cachedToken = null;
let _cachedTokenExpMs = 0;

function cleanVrm(v) {
  return String(v || "").replace(/\s+/g, "").toUpperCase();
}

function normalizeDateToIso(dateStr) {
  if (!dateStr) return null;
  // DVSA older format: "2014.11.02"
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) return dateStr.replace(/\./g, "-");
  // already ISO "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // sometimes "YYYY.MM.DD HH:mm:ss" exists for completedDate, ignore
  return null;
}

function maxIsoDate(dates) {
  const iso = dates.map(normalizeDateToIso).filter(Boolean);
  if (!iso.length) return null;
  iso.sort(); // lexical works for YYYY-MM-DD
  return iso[iso.length - 1];
}

// Fallback estimator if we still cannot get a real day
function estimateMotExpiryDateFromDVLA(dvla) {
  if (dvla?.motExpiryDate) return { date: dvla.motExpiryDate, estimated: false };

  const mor = dvla?.monthOfFirstRegistration; // "YYYY-MM"
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

async function getDvsaAccessToken() {
  const now = Date.now();
  if (_cachedToken && now < _cachedTokenExpMs - 30_000) return _cachedToken;

  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE_URL;

  // If any missing, just skip OAuth (we’ll still try API key flow if possible)
  if (!tokenUrl || !clientId || !clientSecret || !scope) return null;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", scope);

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    // don’t hard-fail the whole endpoint if token fails
    console.error("DVSA token error:", r.status, data);
    return null;
  }

  const token = data.access_token;
  const expiresIn = Number(data.expires_in || 0); // seconds
  if (!token) return null;

  _cachedToken = token;
  _cachedTokenExpMs = Date.now() + expiresIn * 1000;
  return token;
}

/**
 * Fetch MOT history to get precise expiry date.
 *
 * We try:
 *  1) DVSA_BASE_URL (default https://tapi.dvsa.gov.uk) with x-api-key + optional Bearer token
 *  2) fallback to https://beta.check-mot.service.gov.uk (old host) using x-api-key only
 */
async function fetchMotExpiryPrecise(vrm) {
  const apiKey = process.env.DVSA_API_KEY;
  if (!apiKey) return null;

  const basePrimary = (process.env.DVSA_BASE_URL || "https://tapi.dvsa.gov.uk").replace(/\/+$/, "");
  const baseFallback = "https://beta.check-mot.service.gov.uk";

  const token = await getDvsaAccessToken();

  const tryOne = async (baseUrl) => {
    const url = `${baseUrl}/trade/vehicles/mot-tests?registration=${encodeURIComponent(vrm)}`;

    const headers = {
      Accept: "application/json+v6",
      "x-api-key": apiKey,
    };

    // If token exists, include it (newer setups may require it)
    if (token) headers.Authorization = `Bearer ${token}`;

    const r = await fetch(url, { method: "GET", headers });
    if (r.status === 404) return null;

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      // 401/403 etc — let caller decide fallback
      const err = new Error(`MOT history request failed: ${r.status}`);
      err.status = r.status;
      err.data = data;
      throw err;
    }

    // Expected shape (old API): array of vehicles
    const vehicle = Array.isArray(data) ? data[0] : null;
    if (!vehicle) return null;

    // Most reliable: max expiryDate from motTests[]
    const expiry = maxIsoDate((vehicle.motTests || []).map((t) => t.expiryDate));

    // Some vehicles may provide due date when no MOT exists
    const due = normalizeDateToIso(vehicle.motTestDueDate);

    return expiry || due || null;
  };

  // 1) primary
  try {
    const d = await tryOne(basePrimary);
    if (d) return d;
  } catch (e) {
    // if auth/host mismatch, fall through to fallback
    console.warn("Primary MOT endpoint failed:", e?.status || "", e?.message || e);
  }

  // 2) fallback host (older docs)
  try {
    const d = await tryOne(baseFallback);
    if (d) return d;
  } catch (e) {
    console.warn("Fallback MOT endpoint failed:", e?.status || "", e?.message || e);
  }

  return null;
}

// ---------------------------
// Handler
// ---------------------------
export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const dvlaApiKey = process.env.DVLA_API_KEY;
    if (!dvlaApiKey) return res.status(500).json({ error: "DVLA_API_KEY missing in Vercel env" });

    const vrmRaw =
      (req.query && (req.query.vrm || req.query.registrationNumber)) ||
      String(req.url || "").split("/").pop();

    const vrm = cleanVrm(vrmRaw);
    if (!vrm) return res.status(400).json({ error: "VRM required" });

    // 1) DVLA lookup
    const dvlaRes = await fetch(DVLA_URL, {
      method: "POST",
      headers: {
        "x-api-key": dvlaApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registrationNumber: vrm }),
    });

    const dvlaText = await dvlaRes.text();
    let dvlaData;
    try {
      dvlaData = JSON.parse(dvlaText);
    } catch {
      dvlaData = { raw: dvlaText };
    }

    if (!dvlaRes.ok) {
      return res.status(dvlaRes.status).json({
        error: "DVLA request failed",
        status: dvlaRes.status,
        details: dvlaData,
      });
    }

    // 2) MOT precise date via MOT history API (if available)
    const preciseMot = await fetchMotExpiryPrecise(vrm);

    // 3) Fallback estimator if still missing
    const fallbackMot = estimateMotExpiryDateFromDVLA(dvlaData);

    const finalMotDate = preciseMot || dvlaData?.motExpiryDate || fallbackMot.date || null;
    const isEstimated = !preciseMot && !dvlaData?.motExpiryDate && !!fallbackMot.estimated;

    return res.status(200).json({
      ...dvlaData,

      model: dvlaData.model ?? dvlaData.vehicleModel ?? null,

      // ✅ guaranteed keys for frontend
      motExpiryDate: finalMotDate,
      motExpiryEstimated: isEstimated,

      // optional debug (handy while testing, remove later)
      motSource: preciseMot ? "mot-history" : dvlaData?.motExpiryDate ? "dvla" : fallbackMot.date ? "estimated" : "none",
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}