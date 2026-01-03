import { useEffect, useState, useCallback } from "react";
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
  return {
    user_id: userId,

    registration_number:
      vehicle.registrationNumber?.replace(/\s+/g, "").toUpperCase() || "",
    nickname: vehicle.nickname || "",

    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year ? Number(vehicle.year) : null,
    color: vehicle.color || "",
    fuel_type: vehicle.fuelType || "",
    mileage:
      vehicle.mileage === "" ||
      vehicle.mileage === null ||
      vehicle.mileage === undefined
        ? null
        : Number(vehicle.mileage),

    mot_expiry: vehicle.motExpiry || null,
    tax_expiry: vehicle.isSorn ? null : vehicle.taxExpiry || null,
    insurance_expiry: vehicle.isUninsured ? null : vehicle.insuranceExpiry || null,
    insurance_policy_number: vehicle.isUninsured
      ? null
      : vehicle.insurancePolicyNumber || null,

    is_uninsured: !!vehicle.isUninsured,
    is_sorn: !!vehicle.isSorn,
    service_date: vehicle.serviceDate || null,

    // ✅ Photos
    photo_url: vehicle.photoUrl || null,
    photo_path: vehicle.photoPath || null,

    updated_at: new Date().toISOString(),
  };
}

function fromDb(row) {
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

    // ✅ Photos
    photoUrl: row.photo_url || "",
    photoPath: row.photo_path || "",

    lastUpdated: row.updated_at || row.created_at,
  };
}

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const TABLE = "vehicles";

  // ✅ Change if you named the bucket differently
  const BUCKET = "vehicle-photos";

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
      delete payload.user_id;

      const { data, error } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      const updated = fromDb(data);
      setVehicles((prev) =>
        prev.map((v) => (String(v.id) === String(id) ? updated : v))
      );
      return updated;
    },
    [user?.id]
  );

  const deleteVehicle = useCallback(
    async (id) => {
      if (!user?.id) throw new Error("Not logged in.");

      // Optional: if you want auto-delete photo when deleting vehicle
      const existing = vehicles.find((v) => String(v.id) === String(id));
      if (existing?.photoPath) {
        await supabase.storage.from(BUCKET).remove([existing.photoPath]);
      }

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setVehicles((prev) => prev.filter((v) => String(v.id) !== String(id)));
    },
    [user?.id, vehicles]
  );

  // ✅ DVLA lookup via Vercel API route
  const lookupDVLA = useCallback(async (registrationNumber) => {
    const clean = String(registrationNumber || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!clean) return null;

    try {
      const res = await fetch(`/api/dvla/${clean}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return MOCK_DVLA_DATA[clean] || null;
    }
  }, []);

  // ============================
  // ✅ Vehicle Photos (Supabase Storage)
  // ============================

  const uploadVehiclePhoto = useCallback(
    async (vehicleId, file) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!vehicleId) throw new Error("vehicleId is required.");
      if (!file) throw new Error("No file provided.");

      // Basic file validation
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        throw new Error("Please upload a JPG, PNG, or WEBP image.");
      }

      // Create a stable path: userId/vehicleId/timestamp.ext
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${vehicleId}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      if (!publicUrl) {
        throw new Error("Failed to generate public URL for uploaded image.");
      }

      return { photoUrl: publicUrl, photoPath: path };
    },
    [user?.id]
  );

  const removeVehiclePhoto = useCallback(
    async (vehicleId) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!vehicleId) throw new Error("vehicleId is required.");

      const current = vehicles.find((v) => String(v.id) === String(vehicleId));
      if (!current) throw new Error("Vehicle not found.");
      if (!current.photoPath) {
        // nothing to remove, still update db to nulls for safety
        await updateVehicle(vehicleId, { photoUrl: "", photoPath: "" });
        return;
      }

      await supabase.storage.from(BUCKET).remove([current.photoPath]);

      // Clear in DB
      await updateVehicle(vehicleId, { photoUrl: "", photoPath: "" });
    },
    [user?.id, vehicles, updateVehicle]
  );

  // One-call helper: upload + update DB (and cleanup old image)
  const setVehiclePhotoFromFile = useCallback(
    async (vehicleId, file) => {
      if (!user?.id) throw new Error("Not logged in.");
      const current = vehicles.find((v) => String(v.id) === String(vehicleId));

      // Upload new
      const uploaded = await uploadVehiclePhoto(vehicleId, file);

      // Update DB first (so UI gets it immediately)
      await updateVehicle(vehicleId, {
        photoUrl: uploaded.photoUrl,
        photoPath: uploaded.photoPath,
      });

      // Then cleanup old file (optional but recommended)
      const oldPath = current?.photoPath;
      if (oldPath && oldPath !== uploaded.photoPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      return uploaded;
    },
    [user?.id, vehicles, uploadVehiclePhoto, updateVehicle]
  );

  return {
    vehicles,
    loadingVehicles,
    refresh,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    lookupDVLA,

    // ✅ photos
    uploadVehiclePhoto,
    removeVehiclePhoto,
    setVehiclePhotoFromFile,
  };
}