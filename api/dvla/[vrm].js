// api/dvla/[vrm].js
//
// Uses MOT History API for precise dates, falls back to VES for new vehicles
//
export const config = {
  runtime: "nodejs",
};

const VES_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

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

// Get OAuth token from Microsoft Entra ID
async function getDvsaToken() {
  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE_URL;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error("Missing DVSA OAuth env vars");
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
  try { j = JSON.parse(text); } catch {}

  if (!r.ok) {
    throw new Error(`Token request failed: ${r.status} - ${text?.slice(0, 200)}`);
  }
  if (!j?.access_token) {
    throw new Error("No access_token in response");
  }
  return j.access_token;
}

async function fetchDvsaExactMotExpiry(vrm) {
  const apiKey = process.env.DVSA_API_KEY;
  if (!apiKey) throw new Error("DVSA_API_KEY missing in env");

  // Get OAuth token
  const token = await getDvsaToken();

  // New API endpoint: https://history.mot.api.gov.uk/v1/trade/vehicles/registration/{reg}
  const url = `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(vrm)}`;

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
  try { data = JSON.parse(text); } catch {}

  if (!r.ok) {
    throw new Error(`DVSA MOT failed: ${r.status} ${text?.slice(0, 200)}`);
  }

  // Response is a single vehicle object (not array)
  const motTests = data?.motTests || [];

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

// Fetch from VES API (returns vehicle details + estimated MOT due for new vehicles)
async function fetchVesData(vrm) {
  const apiKey = process.env.DVLA_API_KEY;
  if (!apiKey) throw new Error("DVLA_API_KEY missing in env");

  const r = await fetch(VES_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ registrationNumber: vrm }),
  });

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}

  if (!r.ok) {
    throw new Error(`VES failed: ${r.status} ${text?.slice(0, 200)}`);
  }

  return data;
}

// Calculate first MOT due date (3 years from first registration)
function calculateFirstMotDue(registrationDate) {
  if (!registrationDate) return null;

  const regDate = new Date(registrationDate);
  if (isNaN(regDate.getTime())) return null;

  // First MOT due 3 years after registration
  regDate.setFullYear(regDate.getFullYear() + 3);

  return regDate.toISOString().split("T")[0];
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
    let motExpiryEstimated = false;
    let motExpirySource = null;
    let motHistoryError = null;
    let vesData = null;
    let vesError = null;

    // 1. Try MOT History API first (for precise dates)
    try {
      motExpiryDate = await fetchDvsaExactMotExpiry(vrm);
      if (motExpiryDate) {
        motExpirySource = "MOT_HISTORY";
      }
    } catch (e) {
      motHistoryError = String(e?.message || e);
    }

    // 2. If no MOT history, fall back to VES for vehicle data
    try {
      vesData = await fetchVesData(vrm);
    } catch (e) {
      vesError = String(e?.message || e);
    }

    // 3. If no MOT expiry from history, calculate from registration date
    if (!motExpiryDate && vesData) {
      // Check if VES has motExpiryDate (it sometimes does for older vehicles)
      if (vesData.motExpiryDate) {
        motExpiryDate = vesData.motExpiryDate;
        motExpirySource = "VES";
      }
      // For new vehicles, calculate first MOT due date
      else if (vesData.monthOfFirstRegistration || vesData.dateOfLastV5CIssued) {
        const regDate = vesData.monthOfFirstRegistration
          ? `${vesData.monthOfFirstRegistration}-01` // "2024-01" -> "2024-01-01"
          : vesData.dateOfLastV5CIssued;

        const calculatedDate = calculateFirstMotDue(regDate);
        if (calculatedDate) {
          motExpiryDate = calculatedDate;
          motExpiryEstimated = true;
          motExpirySource = "CALCULATED_FROM_REGISTRATION";
        }
      }
    }

    return res.status(200).json({
      registrationNumber: vrm,

      // Vehicle details from VES
      make: vesData?.make || null,
      model: vesData?.model || null,
      yearOfManufacture: vesData?.yearOfManufacture || null,
      colour: vesData?.colour || null,
      fuelType: vesData?.fuelType || null,
      taxStatus: vesData?.taxStatus || null,
      taxDueDate: vesData?.taxDueDate || null,
      monthOfFirstRegistration: vesData?.monthOfFirstRegistration || null,

      // MOT data
      motExpiryDate: motExpiryDate || null,
      motExpiryEstimated,
      motExpirySource: motExpirySource || "NO_DATA",

      // Errors (for debugging)
      motHistoryError,
      vesError,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}