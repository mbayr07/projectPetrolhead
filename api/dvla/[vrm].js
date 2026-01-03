export default async function handler(req, res) {
  try {
    const { vrm } = req.query;

    if (!vrm) {
      return res.status(400).json({ error: "Missing VRM" });
    }

    const cleaned = String(vrm).replace(/\s+/g, "").toUpperCase();

    const resp = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.DVLA_API_KEY,
      },
      body: JSON.stringify({ registrationNumber: cleaned }),
    });

    const text = await resp.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "DVLA request failed",
        status: resp.status,
        details: data || { message: text },
      });
    }

    // ✅ Return the fields your UI expects (including MOT expiry)
    return res.status(200).json({
      registrationNumber: data.registrationNumber ?? cleaned,

      // core
      make: data.make ?? null,
      model: data.model ?? data.vehicleModel ?? null, // (usually null from DVLA)
      yearOfManufacture: data.yearOfManufacture ?? null,
      colour: data.colour ?? null,
      fuelType: data.fuelType ?? null,

      // tax
      taxStatus: data.taxStatus ?? null,
      taxDueDate: data.taxDueDate ?? null,

      // mot
      motStatus: data.motStatus ?? null,
      motExpiryDate: data.motExpiryDate ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: String(err?.message || err) });
  }
}