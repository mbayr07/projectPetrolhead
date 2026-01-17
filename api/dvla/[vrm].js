// api/dvla/[vrm].js
export const config = {
  runtime: "nodejs",
};

const {
  DVSA_CLIENT_ID,
  DVSA_CLIENT_SECRET,
  DVSA_TOKEN_URL,
  DVSA_SCOPE_URL,
  DVSA_API_KEY,
  DVSA_BASE_URL,
} = process.env;

/**
 * Get OAuth2 access token for DVSA
 */
async function getDvsaAccessToken() {
  if (!DVSA_CLIENT_ID || !DVSA_CLIENT_SECRET || !DVSA_TOKEN_URL || !DVSA_SCOPE_URL) {
    throw new Error("DVSA OAuth environment variables missing");
  }

  const body = new URLSearchParams({
    client_id: DVSA_CLIENT_ID,
    client_secret: DVSA_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: DVSA_SCOPE_URL,
  });

  const res = await fetch(DVSA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`DVSA token error: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Extract latest MOT expiry date from DVSA response
 */
function extractMotExpiry(vehicle) {
  if (!vehicle?.motTests?.length) {
    return { date: null, estimated: false };
  }

  // Sort MOTs by completed date (latest first)
  const sorted = [...vehicle.motTests].sort(
    (a, b) => new Date(b.completedDate) - new Date(a.completedDate)
  );

  const latest = sorted[0];

  return {
    date: latest.expiryDate || null,
    estimated: false,
  };
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!DVSA_API_KEY || !DVSA_BASE_URL) {
      return res.status(500).json({ error: "DVSA API env vars missing" });
    }

    const vrmRaw =
      req.query?.vrm ||
      req.query?.registrationNumber ||
      String(req.url || "").split("/").pop();

    const vrm = String(vrmRaw || "").replace(/\s+/g, "").toUpperCase();
    if (!vrm) {
      return res.status(400).json({ error: "VRM required" });
    }

    // 1️⃣ Get OAuth token
    const accessToken = await getDvsaAccessToken();

    // 2️⃣ Call DVSA MOT history
    const dvsaRes = await fetch(
      `${DVSA_BASE_URL}/mot-history/vehicles/${encodeURIComponent(vrm)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": DVSA_API_KEY,
          Accept: "application/json",
        },
      }
    );

    const text = await dvsaRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!dvsaRes.ok) {
      return res.status(dvsaRes.status).json({
        error: "DVSA MOT request failed",
        status: dvsaRes.status,
        details: data,
      });
    }

    const vehicle = Array.isArray(data) ? data[0] : data;
    const mot = extractMotExpiry(vehicle);

    // 3️⃣ Return clean, frontend-friendly payload
    return res.status(200).json({
      registrationNumber: vehicle.registration,
      make: vehicle.make || null,
      model: vehicle.model || null,
      primaryColour: vehicle.primaryColour || null,
      fuelType: vehicle.fuelType || null,
      yearOfManufacture: vehicle.manufactureDate || null,

      // ✅ THIS IS WHAT YOU CARE ABOUT
      motExpiryDate: mot.date,
      motExpiryEstimated: mot.estimated,

      // keep raw in case you want more later
      raw: vehicle,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}