// src/hooks/useVehicles.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Keep your DVLA fetch helper (optional)
const DVLA_FALLBACK = {
  AB12CDE: { make: "BMW", model: "M3", year: 2020, color: "Alpine White", fuelType: "Petrol", isSorn: false },
  XY98ZAB: { make: "Audi", model: "A4", year: 2019, color: "Mythos Black", fuelType: "Diesel", isSorn: true },
};

function toUiVehicle(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,

    registrationNumber: row.registration_number,
    nickname: row.nickname,

    make: row.make || "",
    model: row.model || "",
    year: row.year ?? "",
    color: row.color || "",
    fuelType: row.fuel_type || "",
    mileage: row.mileage ?? "",

    motExpiry: row.mot_expiry ?? "",        // UI can treat "" as blank
    taxExpiry: row.tax_expiry ?? "",
    insuranceExpiry: row.insurance_expiry ?? "",
    insurancePolicyNumber: row.insurance_policy_number ?? "",

    isUninsured: !!row.is_uninsured,
    isSorn: !!row.is_sorn,
    serviceDate: row.service_date ?? "",

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbVehicle(ui, userId) {
  // Convert UI blanks -> null for DB dates/numbers
  const nullIfBlank = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  const intOrNull = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  const cleanVrm = String(ui?.registrationNumber || "").replace(/\s+/g, "").toUpperCase();

  return {
    user_id: userId,
    registration_number: cleanVrm,
    nickname: String(ui?.nickname || "").trim(),

    make: nullIfBlank(ui?.make),
    model: nullIfBlank(ui?.model),
    year: intOrNull(ui?.year),
    color: nullIfBlank(ui?.color),
    fuel_type: nullIfBlank(ui?.fuelType),
    mileage: intOrNull(ui?.mileage),

    mot_expiry: nullIfBlank(ui?.motExpiry),
    tax_expiry: ui?.isSorn ? null : nullIfBlank(ui?.taxExpiry),
    insurance_expiry: ui?.isUninsured ? null : nullIfBlank(ui?.insuranceExpiry),
    insurance_policy_number: ui?.isUninsured ? null : nullIfBlank(ui?.insurancePolicyNumber),

    is_uninsured: !!ui?.isUninsured,
    is_sorn: !!ui?.isSorn,
    service_date: nullIfBlank(ui?.serviceDate),
  };
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const refresh = useCallback(async () => {
    setLoadingVehicles(true);

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      console.error(sessErr);
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }

    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setVehicles([]);
    } else {
      setVehicles((data || []).map(toUiVehicle));
    }

    setLoadingVehicles(false);
  }, []);

  useEffect(() => {
    // Load once
    refresh();

    // React to auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub?.subscription?.unsubscribe?.();
  }, [refresh]);

  const addVehicle = useCallback(
    async (vehicleData) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const payload = toDbVehicle(vehicleData, userId);

      const { data, error } = await supabase
        .from("vehicles")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const ui = toUiVehicle(data);
      setVehicles((prev) => [ui, ...prev]);
      return ui;
    },
    []
  );

  const updateVehicle = useCallback(
    async (id, updates) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const payload = toDbVehicle(updates, userId);

      // Prevent changing owner by accident
      delete payload.user_id;

      const { data, error } = await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      const ui = toUiVehicle(data);
      setVehicles((prev) => prev.map((v) => (v.id === id ? ui : v)));
      return ui;
    },
    []
  );

  const deleteVehicle = useCallback(async (id) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw error;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // ✅ REAL DVLA LOOKUP (via your /api proxy). Falls back to mock if not available.
  const lookupDVLA = useCallback(async (registrationNumber) => {
    const clean = String(registrationNumber || "").replace(/\s+/g, "").toUpperCase();
    if (!clean) return null;

    try {
      const res = await fetch(`/api/dvla/${clean}`);
      if (!res.ok) throw new Error("DVLA lookup failed");
      const data = await res.json();

      // Map DVLA response -> your form fields
      // (DVLA uses: make, colour, fuelType, yearOfManufacture, motExpiryDate, taxDueDate, taxStatus, motStatus)
      return {
        make: data.make || "",
        model: "", // DVLA response typically doesn't include model
        year: data.yearOfManufacture ?? "",
        color: data.colour || "",
        fuelType: data.fuelType || "",
        // Optional: autopopulate dates if you want
        motExpiry: data.motExpiryDate || "",
        taxExpiry: data.taxDueDate || "",
        isSorn: (String(data.taxStatus || "").toLowerCase() === "sorn") || false,
      };
    } catch (_e) {
      return DVLA_FALLBACK[clean] || null;
    }
  }, []);

  return useMemo(
    () => ({
      vehicles,
      loadingVehicles,
      refresh,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      lookupDVLA,
    }),
    [vehicles, loadingVehicles, refresh, addVehicle, updateVehicle, deleteVehicle, lookupDVLA]
  );
}