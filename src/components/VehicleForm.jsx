// src/components/VehicleForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useVehicles } from "@/hooks/useVehicles";

// ✅ Robust image validation (handles weird/empty MIME types)
function isAllowedImage(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();

  const allowedMime = new Set([
    "image/png",
    "image/x-png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/octet-stream",
    "",
  ]);

  const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];
  const hasAllowedExt = allowedExt.some((ext) => name.endsWith(ext));

  return allowedMime.has(mime) || hasAllowedExt;
}

export default function VehicleForm({ onSuccess, initialData = null }) {
  const { addVehicle, updateVehicle, lookupDVLA, uploadVehiclePhoto } = useVehicles();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = useMemo(
    () => ({
      registrationNumber: "",
      nickname: "",
      make: "",
      model: "",
      year: "",
      color: "",
      fuelType: "",
      mileage: "",
      motExpiry: "",
      taxExpiry: "",
      insuranceExpiry: "",
      insurancePolicyNumber: "",
      isUninsured: false,
      serviceDate: "",
      isSorn: false,

      // ✅ Photos (camelCase matches your hook/fromDb)
      photoUrl: "",
      photoPath: "",
    }),
    []
  );

  const [formData, setFormData] = useState(initialData ? { ...blank, ...initialData } : blank);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photoUrl || "");

  // Only re-init when switching between different vehicles (edit mode), NOT on file change
  useEffect(() => {
    const next = initialData ? { ...blank, ...initialData } : blank;
    setFormData(next);

    setPhotoFile(null);
    setPhotoPreview(next.photoUrl || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // Cleanup blob preview
  useEffect(() => {
    return () => {
      // only revoke object URLs (blob:...)
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
      toast({
        title: "Unsupported file type",
        description: `Please upload a JPG, PNG, or WEBP image. (Got: name="${file?.name}", type="${file?.type}")`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Too large",
        description: "Max 5MB image size.",
        variant: "destructive",
      });
      return;
    }

    // Revoke old blob preview if needed
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));

    // IMPORTANT: do NOT touch formData here (this is what was wiping DVLA-filled values)
  };

  const clearPhoto = () => {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
    setFormData((p) => ({ ...p, photoUrl: "", photoPath: "" }));
  };

  const handleDVLALookup = async () => {
    if (!formData.registrationNumber) {
      toast({
        title: "Registration Required",
        description: "Please enter a registration number first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dvla = await lookupDVLA(formData.registrationNumber);

      if (!dvla) {
        toast({
          title: "Not Found",
          description: "No DVLA data returned for this registration.",
          variant: "destructive",
        });
        return;
      }

      const taxStatus = String(dvla.taxStatus || "").toUpperCase();
      const isSornFromDVLA = taxStatus === "SORN" || dvla.isSorn === true;

      setFormData((prev) => ({
        ...prev,

        make: dvla.make ?? prev.make,
        model: dvla.model ?? prev.model,
        year: dvla.yearOfManufacture ?? dvla.year ?? prev.year,
        color: dvla.colour ?? dvla.color ?? prev.color,
        fuelType: dvla.fuelType ?? prev.fuelType,

        motExpiry: dvla.motExpiryDate ?? dvla.motExpiry ?? prev.motExpiry,
        taxExpiry: isSornFromDVLA ? "" : (dvla.taxDueDate ?? dvla.taxExpiry ?? prev.taxExpiry),

        isSorn: isSornFromDVLA ? true : prev.isSorn,
      }));

      // Show appropriate toast based on what data we got
      if (dvla.motExpiryDate) {
        toast({ title: "Vehicle Found!", description: "MOT expiry date loaded." });
      } else if (dvla.motHistoryError) {
        toast({
          title: "MOT Lookup Issue",
          description: dvla.motHistoryError,
          variant: "destructive",
        });
      } else {
        toast({
          title: "No MOT Data",
          description: "No MOT expiry found for this vehicle. It may be new or exempt.",
        });
      }
    } catch {
      toast({
        title: "Lookup failed",
        description: "Could not fetch DVLA data. Is the server running?",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Build payload from current formData (DVLA values included)
    const basePayload = {
      ...formData,
      isSorn: !!formData.isSorn,
      isUninsured: !!formData.isUninsured,

      motExpiry: formData.motExpiry || "",
      taxExpiry: formData.isSorn ? "" : (formData.taxExpiry || ""),
      insuranceExpiry: formData.isUninsured ? "" : (formData.insuranceExpiry || ""),
      insurancePolicyNumber: formData.isUninsured ? "" : (formData.insurancePolicyNumber || ""),
      serviceDate: formData.serviceDate || "",
    };

    try {
      // 1) Save vehicle FIRST
      let vehicleId = initialData?.id;
      let created;

      if (vehicleId) {
        await updateVehicle(vehicleId, basePayload);
      } else {
        created = await addVehicle(basePayload);
        vehicleId = created?.id;
      }

      // 2) Upload photo second (if any), then update ONLY photo fields
      if (photoFile && vehicleId) {
        const uploaded = await uploadVehiclePhoto(vehicleId, photoFile); // ✅ IMPORTANT: (vehicleId, file)

        if (uploaded?.photoUrl) {
          await updateVehicle(vehicleId, {
            photoUrl: uploaded.photoUrl,
            photoPath: uploaded.photoPath,
          });

          // keep UI in sync
          setFormData((p) => ({
            ...p,
            photoUrl: uploaded.photoUrl,
            photoPath: uploaded.photoPath,
          }));
          setPhotoPreview(uploaded.photoUrl);
          setPhotoFile(null);
        }
      }

      toast({
        title: initialData ? "Vehicle Updated" : "Vehicle Added",
        description: "Saved successfully.",
      });
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Save failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => {
        const next = { ...prev, [name]: checked };
        if (name === "isSorn" && checked) next.taxExpiry = "";
        if (name === "isUninsured" && checked) {
          next.insuranceExpiry = "";
          next.insurancePolicyNumber = "";
        }
        return next;
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      onKeyDown={(e) => {
        // ✅ Prevent accidental submit / scroll jump on Enter inside inputs (feels more “app-like”)
        if (e.key === "Enter" && e.target?.tagName === "INPUT") {
          const type = e.target.getAttribute?.("type");
          if (type !== "submit") e.preventDefault();
        }
      }}
    >
      <div className="space-y-4">
        {/* Photo */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label>Vehicle photo</Label>
              <p className="text-xs text-muted-foreground">
                Optional. If not uploaded, we’ll keep the logo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {photoPreview ? (
                <>
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-border">
                    <img src={photoPreview} alt="Vehicle" className="h-full w-full object-cover" />
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={clearPhoto}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* ✅ data-filepicker helps your Dialog ignore outside-click logic for file picking */}
              <label className="cursor-pointer" data-filepicker>
                {/* IMPORTANT: no name attribute + no generic handleChange */}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <span className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm hover:bg-muted">
                  Upload
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* VRM + DVLA */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              placeholder="AB12 CDE"
              className="uppercase"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleDVLALookup} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              DVLA Lookup
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            placeholder="e.g., My M3"
            required
          />
        </div>

        {/* SORN */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4">
          <input
            id="isSorn"
            name="isSorn"
            type="checkbox"
            checked={!!formData.isSorn}
            onChange={handleChange}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <div className="space-y-1">
            <Label htmlFor="isSorn" className="cursor-pointer">
              Currently SORN
            </Label>
            <p className="text-xs text-muted-foreground">If ticked, Tax date becomes “not applicable”.</p>
          </div>
        </div>

        {/* Uninsured */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4">
          <input
            id="isUninsured"
            name="isUninsured"
            type="checkbox"
            checked={!!formData.isUninsured}
            onChange={handleChange}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <div className="space-y-1">
            <Label htmlFor="isUninsured" className="cursor-pointer">
              Currently not insured
            </Label>
            <p className="text-xs text-muted-foreground">If ticked, Insurance date & policy number become “not applicable”.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Make" name="make" value={formData.make} onChange={handleChange} required />
          <InputField label="Model" name="model" value={formData.model} onChange={handleChange} required />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <InputField label="Year" name="year" type="number" value={formData.year} onChange={handleChange} required />
          <InputField label="Color" name="color" value={formData.color} onChange={handleChange} />
          <InputField label="Fuel Type" name="fuelType" value={formData.fuelType} onChange={handleChange} />
        </div>

        <InputField label="Mileage" name="mileage" type="number" value={formData.mileage} onChange={handleChange} />

        <DateField label="MOT Expiry" name="motExpiry" value={formData.motExpiry} onChange={handleChange} />
        <DateField
          label="Tax Expiry"
          name="taxExpiry"
          value={formData.taxExpiry}
          onChange={handleChange}
          disabled={!!formData.isSorn}
          hint={formData.isSorn ? "Not applicable while SORN." : undefined}
        />
        <DateField
          label="Insurance Expiry"
          name="insuranceExpiry"
          value={formData.insuranceExpiry}
          onChange={handleChange}
          disabled={!!formData.isUninsured}
          hint={formData.isUninsured ? "Not applicable while not insured." : undefined}
        />

        <InputField
          label="Insurance Policy Number"
          name="insurancePolicyNumber"
          value={formData.insurancePolicyNumber}
          onChange={handleChange}
          disabled={!!formData.isUninsured}
        />
        <DateField label="Last Service" name="serviceDate" value={formData.serviceDate} onChange={handleChange} />
      </div>

      <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-primary to-secondary">
        {saving ? "Saving..." : initialData ? "Update Vehicle" : "Add Vehicle"}
      </Button>
    </form>
  );
}

function InputField({ label, hint, ...props }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input {...props} />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function DateField({ label, hint, ...props }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="date" {...props} />
      <p className="text-xs text-muted-foreground mt-1">{hint || "Leave blank = No data held."}</p>
    </div>
  );
}