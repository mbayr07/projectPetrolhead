// api/dvla/[vrm].js

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.DVLA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DVLA_API_KEY missing in Vercel env" });

    // Vercel dynamic param
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

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
      stack: err?.stack || null,
    });
  }
}