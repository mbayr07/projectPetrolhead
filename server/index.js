// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const DVLA_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/dvla/:vrm", async (req, res) => {
  try {
    const apiKey = process.env.DVLA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DVLA_API_KEY missing in server .env" });

    const vrm = String(req.params.vrm || "").replace(/\s+/g, "").toUpperCase();
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
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!dvlaRes.ok) {
      return res.status(dvlaRes.status).json({
        error: "DVLA request failed",
        status: dvlaRes.status,
        details: data,
      });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
});

const port = process.env.PORT || 5174;
app.listen(port, () => console.log(`DVLA proxy running on http://localhost:${port}`));