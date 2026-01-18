// server/index.js
//
// VES API is currently DISABLED - only MOT History API is active
// To re-enable VES, set USE_VES_API = true below
//
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const USE_VES_API = false; // Set to true to re-enable VES API
const DVLA_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

// DVSA often uses "YYYY.MM.DD" -> convert to "YYYY-MM-DD"
function dvsaDateToIso(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return s.replaceAll(".", "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

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

  if (!r.ok) throw new Error(`DVSA token failed: ${r.status}`);
  if (!j?.access_token) throw new Error("DVSA token missing access_token");
  return j.access_token;
}

async function fetchMotExpiry(vrm) {
  const baseUrl = (process.env.DVSA_BASE_URL || "https://history.mot.api.gov.uk").replace(/\/+$/, "");
  const apiKey = process.env.DVSA_API_KEY;

  if (!apiKey) throw new Error("DVSA_API_KEY missing in .env");

  const token = await getDvsaToken();
  const url = `${baseUrl}/v1/trade/vehicles/registration/${encodeURIComponent(vrm)}`;

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

  if (!r.ok) throw new Error(`DVSA MOT failed: ${r.status} ${text?.slice(0, 200)}`);

  const vehicle = Array.isArray(data) ? data[0] : data;
  const motTests = vehicle?.motTests || [];

  if (!Array.isArray(motTests) || motTests.length === 0) return null;

  const candidates = motTests
    .map((t) => ({
      expiry: dvsaDateToIso(t?.expiryDate),
      completed: String(t?.completedDate || "").trim(),
    }))
    .filter((x) => x.expiry);

  if (!candidates.length) return null;

  candidates.sort((a, b) => (a.completed > b.completed ? -1 : 1));
  return candidates[0].expiry;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/dvla/:vrm", async (req, res) => {
  try {
    const vrm = String(req.params.vrm || "").replace(/\s+/g, "").toUpperCase();
    if (!vrm) return res.status(400).json({ error: "VRM required" });

    // Always fetch MOT expiry from DVSA
    let motExpiryDate = null;
    let motHistoryError = null;

    try {
      motExpiryDate = await fetchMotExpiry(vrm);
    } catch (e) {
      motHistoryError = String(e?.message || e);
    }

    // If VES is disabled, return only MOT data
    if (!USE_VES_API) {
      return res.json({
        registrationNumber: vrm,
        motExpiryDate: motExpiryDate || null,
        motHistoryError,
      });
    }

    // VES API enabled - fetch full vehicle data
    const apiKey = process.env.DVLA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "DVLA_API_KEY missing in server .env" });

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

    // Merge MOT expiry into VES response
    return res.json({
      ...data,
      motExpiryDate: motExpiryDate || data.motExpiryDate || null,
      motHistoryError,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
});

const port = process.env.PORT || 5174;
app.listen(port, () => console.log(`DVLA proxy running on http://localhost:${port}`));