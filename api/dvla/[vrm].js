// api/dvla/[vrm].js

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

export default async function handler(req, res) {
  // Allow GET from your app
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.DVLA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "DVLA_API_KEY missing on server" });
    }

    const { vrm } = req.query;
    const clean = String(vrm || "").replace(/\s+/g, "").toUpperCase();
    if (!clean) return res.status(400).json({ error: "VRM required" });

    const dvlaRes = await fetch(DVLA_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registrationNumber: clean }),
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
    });
  }
}