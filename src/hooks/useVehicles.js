// src/hooks/useVehicles.js
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

const TABLE = "vehicles";
const BUCKET = "vehicle-photos";

function cleanVrm(v) {
  return String(v || "").replace(/\s+/g, "").toUpperCase();
}

function guessExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const m = name.match(/\.([a-z0-9]+)$/i);
  if (m?.[1]) return m[1];

  const mime = String(file?.type || "").toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  return "";
}

function guessContentType(file, ext) {
  const mime = String(file?.type || "").toLowerCase();
  if (mime.startsWith("image/")) return mime;

  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

// INSERT mapping (full object)
function toDbInsert(vehicle, userId) {
  const photoUrl = vehicle.photoUrl ?? vehicle.photo_url ?? "";
  const photoPath = vehicle.photoPath ?? vehicle.photo_path ?? "";

  return {
    user_id: userId,

    registration_number: cleanVrm(vehicle.registrationNumber) || "",
    nickname: vehicle.nickname || "",

    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year ? Number(vehicle.year) : null,
    color: vehicle.color || "",
    fuel_type: vehicle.fuelType || "",
    mileage:
      vehicle.mileage === "" || vehicle.mileage === null || vehicle.mileage === undefined
        ? null
        : Number(vehicle.mileage),

    mot_expiry: vehicle.motExpiry || null,
    tax_expiry: vehicle.isSorn ? null : vehicle.taxExpiry || null,
    insurance_expiry: vehicle.isUninsured ? null : vehicle.insuranceExpiry || null,
    insurance_policy_number: vehicle.isUninsured ? null : vehicle.insurancePolicyNumber || null,

    is_uninsured: !!vehicle.isUninsured,
    is_sorn: !!vehicle.isSorn,
    service_date: vehicle.serviceDate || null,

    photo_url: photoUrl || null,
    photo_path: photoPath || null,

    updated_at: new Date().toISOString(),
  };
}

// UPDATE mapping (PATCH: only fields provided)
function toDbPatch(updates) {
  const patch = {};

  const has = (k) => Object.prototype.hasOwnProperty.call(updates, k);

  // allow both camel + snake input
  if (has("registrationNumber") || has("registration_number")) {
    patch.registration_number = cleanVrm(updates.registrationNumber ?? updates.registration_number) || "";
  }
  if (has("nickname")) patch.nickname = updates.nickname ?? "";

  if (has("make")) patch.make = updates.make ?? "";
  if (has("model")) patch.model = updates.model ?? "";
  if (has("year")) patch.year = updates.year === "" || updates.year === null || updates.year === undefined ? null : Number(updates.year);
  if (has("color")) patch.color = updates.color ?? "";
  if (has("fuelType") || has("fuel_type")) patch.fuel_type = updates.fuelType ?? updates.fuel_type ?? "";
  if (has("mileage")) {
    patch.mileage =
      updates.mileage === "" || updates.mileage === null || updates.mileage === undefined
        ? null
        : Number(updates.mileage);
  }

  if (has("motExpiry") || has("mot_expiry")) patch.mot_expiry = updates.motExpiry ?? updates.mot_expiry ?? null;
  if (has("taxExpiry") || has("tax_expiry")) patch.tax_expiry = updates.taxExpiry ?? updates.tax_expiry ?? null;
  if (has("insuranceExpiry") || has("insurance_expiry")) patch.insurance_expiry = updates.insuranceExpiry ?? updates.insurance_expiry ?? null;
  if (has("insurancePolicyNumber") || has("insurance_policy_number"))
    patch.insurance_policy_number = updates.insurancePolicyNumber ?? updates.insurance_policy_number ?? null;

  if (has("isUninsured") || has("is_uninsured")) patch.is_uninsured = !!(updates.isUninsured ?? updates.is_uninsured);
  if (has("isSorn") || has("is_sorn")) patch.is_sorn = !!(updates.isSorn ?? updates.is_sorn);
  if (has("serviceDate") || has("service_date")) patch.service_date = updates.serviceDate ?? updates.service_date ?? null;

  if (has("photoUrl") || has("photo_url")) patch.photo_url = updates.photoUrl ?? updates.photo_url ?? null;
  if (has("photoPath") || has("photo_path")) patch.photo_path = updates.photoPath ?? updates.photo_path ?? null;

  patch.updated_at = new Date().toISOString();
  return patch;
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

    photoUrl: row.photo_url || "",
    photoPath: row.photo_path || "",

    lastUpdated: row.updated_at || row.created_at,
  };
}

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

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

      const payload = toDbInsert(vehicleData, user.id);

      const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();
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

      const patch = toDbPatch(updates);

      const { data, error } = await supabase
        .from(TABLE)
        .update(patch)
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

      const existing = vehicles.find((v) => String(v.id) === String(id));
      if (existing?.photoPath) {
        await supabase.storage.from(BUCKET).remove([existing.photoPath]);
      }

      const { error } = await supabase.from(TABLE).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;

      setVehicles((prev) => prev.filter((v) => String(v.id) !== String(id)));
    },
    [user?.id, vehicles]
  );

  const lookupDVLA = useCallback(async (registrationNumber) => {
    const clean = cleanVrm(registrationNumber);
    if (!clean) return null;

    try {
      const res = await fetch(`/api/dvla/${clean}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return MOCK_DVLA_DATA[clean] || null;
    }
  }, []);

  // ✅ Signature matches your VehicleForm: uploadVehiclePhoto(vehicleId, file)
  const uploadVehiclePhoto = useCallback(
    async (vehicleId, file) => {
      if (!user?.id) throw new Error("Not logged in.");
      if (!vehicleId) throw new Error("vehicleId is required.");
      if (!file) throw new Error("No file provided.");

      const mime = String(file.type || "").toLowerCase();
      const extRaw = guessExt(file);
      const ext = extRaw === "jpeg" ? "jpg" : extRaw;

      const looksImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
      if (!looksImage) {
        throw new Error(`Please upload a JPG, PNG, or WEBP image. (Got: name="${file?.name}", type="${file?.type}")`);
      }
      if (mime.includes("heic") || mime.includes("heif") || ext === "heic" || ext === "heif") {
        throw new Error("HEIC/HEIF isn’t supported yet. Please export as JPG or PNG.");
      }

      const allowedExt = new Set(["png", "jpg", "webp"]);
      const finalExt = allowedExt.has(ext)
        ? ext
        : mime.includes("png")
        ? "png"
        : mime.includes("webp")
        ? "webp"
        : "jpg";

      const contentType = guessContentType(file, finalExt);

      const path = `${user.id}/${vehicleId}/${Date.now()}.${finalExt}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType,
        cacheControl: "3600",
      });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";

      return { photoUrl: publicUrl, photoPath: path };
    },
    [user?.id]
  );

  return {
    vehicles,
    loadingVehicles,
    refresh,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    lookupDVLA,
    uploadVehiclePhoto,
  };
}