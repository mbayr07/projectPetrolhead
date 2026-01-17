export async function dvlaLookup(registrationNumber) {
  const clean = String(registrationNumber || "").replace(/\s+/g, "").toUpperCase();
  if (!clean) throw new Error("Registration number required");

  const r = await fetch(`/api/dvla/${clean}`, { method: "GET" });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.error || "DVLA/DVSA lookup failed");
  }
  return data;
}