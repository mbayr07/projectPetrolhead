import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const DVLA_KEY = process.env.DVLA_API_KEY;

app.post("/api/dvla", async (req, res) => {
  try {
    const { registrationNumber } = req.body || {};
    if (!registrationNumber) {
      return res.status(400).json({ error: "registrationNumber is required" });
    }

    if (!DVLA_KEY) {
      return res.status(500).json({ error: "DVLA_API_KEY is not set" });
    }

    const r = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "x-api-key": DVLA_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationNumber }),
      }
    );

    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "DVLA request failed" });
  }
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`DVLA proxy listening on ${PORT}`));