import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const MOCK_DVLA_DATA = {
  AB12CDE: {
    make: "VAUXHALL",
    model: "",
    yearOfManufacture: 2017,
    colour: "WHITE",
    fuelType: "PETROL",
    motExpiryDate: "2026-06-11",
    taxDueDate: "2026-12-01",
    taxStatus: "Taxed",
  },
};

function toDb(vehicle, userId) {
  // Map app fields -> DB columns (snake_case)
  return {
    user_id: userId,

    registration_number: vehicle.registrationNumber?.replace(/\s+/g, "").toUpperCase() || "",
    nickname: vehicle.nickname || "",

    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year ? Number(vehicle.year) : null,
    color: vehicle.color || "",
    fuel_type: vehicle.fuelType || "",
    mileage: vehicle.mileage === "" || vehicle.mileage === null || vehicle.mileage === undefined ? null : Number(vehicle.mileage),

    mot_expiry: vehicle.motExpiry || null,
    tax_expiry: vehicle.isSorn ? null : (vehicle.taxExpiry || null),
    insurance_expiry: vehicle.isUninsured ? null : (vehicle.insuranceExpiry || null),
    insurance_policy_number: vehicle.isUninsured ? null : (vehicle.insurancePolicyNumber || null),

    is_uninsured: !!vehicle.isUninsured,
    is_sorn: !!vehicle.isSorn,
    service_date: vehicle.serviceDate || null,

    updated_at: new Date().toISOString(),
  };
}

function fromDb(row) {
  // Map DB -> app fields (camelCase)
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    nickname: row.nickname,

    make: row.make,
    model: row.model,
    year: row.year,
    color: row.color,
    fuelType: row.fuel_type,
    mileage: row.mileage,

    motExpiry: row.mot_expiry || "",
    taxExpiry: row.tax_expiry || "",
    insuranceExpiry: row.insurance_expiry || "",
    insurancePolicyNumber: row.insurance_policy_number || "",

    isUninsured: !!row.is_uninsured,
    isSorn: !!row.is_sorn,
    serviceDate: row.service_date || "",

    lastUpdated: row.updated_at || row.created_at,
  };
}

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // IMPORTANT: set this to your actual table name
  // If you named it differently (e.g. "vg_vehicles"), change it here.
  const TABLE = "vehicles";

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoadingVehicles(true);

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoadingVehicles(false);

    if (error) throw error;
    setVehicles((data || []).map(fromDb));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setVehicles([]);
      return;
    }
    refresh().catch((e) => {
      console.error("Failed to load vehicles:", e);
      setVehicles([]);
    });
  }, [user?.id, refresh]);

  const addVehicle = useCallback(
    async (vehicleData) => {
      if (!user?.id) throw new Error("Not logged in.");

      const payload = toDb(vehicleData, user.id);

      const { data, error } = await supabase
        .from(TABLE)
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const created = fromDb(data);
      setVehicles((prev) => [created, ...prev]);
      return created;
    },
    [user?.id]
  );

  const updateVehicle = useCallback(
    async (id, updates) => {
      if (!user?.id) throw new Error("Not logged in.");

      const payload = toDb(updates, user.id);
      delete payload.user_id; // don't overwrite

      const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      const updated = fromDb(data);
      setVehicles((prev) => prev.map((v) => (String(v.id) === String(id) ? updated : v)));
      return updated;
    },
    [user?.id]
  );

  const deleteVehicle = useCallback(
    async (id) => {
      if (!user?.id) throw new Error("Not logged in.");

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setVehicles((prev) => prev.filter((v) => String(v.id) !== String(id)));
    },
    [user?.id]
  );

  // ✅ DVLA lookup via your Vercel API route
  const lookupDVLA = useCallback(async (registrationNumber) => {
    const clean = String(registrationNumber || "").replace(/\s+/g, "").toUpperCase();
    if (!clean) return null;

    try {
      const res = await fetch(`/api/dvla/${clean}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return MOCK_DVLA_DATA[clean] || null;
    }
  }, []);

  return {
    vehicles,
    loadingVehicles,
    refresh,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    lookupDVLA,
  };
}