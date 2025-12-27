export async function dvlaLookup(registrationNumber) {
  const clean = registrationNumber.replace(/\s+/g, "").toUpperCase();

  const r = await fetch("http://localhost:5174/api/dvla", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registrationNumber: clean }),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.error || "DVLA lookup failed");
  }
  return data;
}