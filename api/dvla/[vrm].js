// api/dvla/[vrm].js
export const config = {
  runtime: "nodejs",
};

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

// helper: estimate MOT due month if DVLA doesn't provide an exact date
function estimateMotExpiryDate(dvla) {
  // If DVLA already provides, use it.
  if (dvla?.motExpiryDate) return { date: dvla.motExpiryDate, estimated: false };

  // If the vehicle is too new, DVLA often doesn't provide MOT date.
  // We can *estimate* using monthOfFirstRegistration (YYYY-MM) if present.
  // UK first MOT is usually due 3 years after first registration.
  const mor = dvla?.monthOfFirstRegistration; // e.g. "2017-06"
  if (!mor || !/^\d{4}-\d{2}$/.test(mor)) return { date: null, estimated: false };

  const [y, m] = mor.split("-").map(Number);
  const estYear = y + 3;
  const estMonth = m; // same month, 3 years later

  // choose last day of that month as a safe estimate (we don't have the exact day)
  const lastDay = new Date(estYear, estMonth, 0); // month is 1-based here because JS Date month is 0-based, but "0" day trick fixes it
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
  const dd = String(lastDay.getDate()).padStart(2, "0");

  return { date: `${yyyy}-${mm}-${dd}`, estimated: true };
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.DVLA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DVLA_API_KEY missing in Vercel env" });

    const vrmRaw =
      (req.query && (req.query.vrm || req.query.registrationNumber)) ||
      String(req.url || "").split("/").pop();

    const vrm = String(vrmRaw || "").replace(/\s+/g, "").toUpperCase();
    if (!vrm) return res.status(400).json({ error: "VRM required" });

    const dvlaRes = await fetch(DVLA_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registrationNumber: vrm }),
    });

    const text = await dvlaRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!dvlaRes.ok) {
      return res.status(dvlaRes.status).json({
        error: "DVLA request failed",
        status: dvlaRes.status,
        details: data,
      });
    }

    // ✅ Add a safe MOT field even when DVLA does not provide motExpiryDate
    const mot = estimateMotExpiryDate(data);

    // ✅ Keep returning the full DVLA payload (so you don't break anything),
    // but add a couple of convenience fields your UI can use.
    return res.status(200).json({
      ...data,

      // convenience aliases (won't exist from DVLA usually, but won't hurt)
      model: data.model ?? data.vehicleModel ?? null,

      // guaranteed keys for frontend
      motExpiryDate: data.motExpiryDate ?? mot.date ?? null,
      motExpiryEstimated: mot.estimated,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}