// src/components/VehicleForm.jsx
import React, { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useVehicles } from "@/hooks/useVehicles";

export default function VehicleForm({ onSuccess, initialData = null }) {
  const { addVehicle, updateVehicle, lookupDVLA } = useVehicles();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const blank = {
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
  };

  const [formData, setFormData] = useState(initialData ? { ...blank, ...initialData } : blank);

  // If the dialog opens with different vehicle, update local state
  useEffect(() => {
    setFormData(initialData ? { ...blank, ...initialData } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

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

        // core info (only overwrite if DVLA provides value)
        make: dvla.make ?? prev.make,
        model: dvla.model ?? prev.model,
        year: dvla.yearOfManufacture ?? dvla.year ?? prev.year,
        color: dvla.colour ?? dvla.color ?? prev.color,
        fuelType: dvla.fuelType ?? prev.fuelType,

        // dates (only overwrite if present)
        motExpiry: dvla.motExpiryDate ?? dvla.motExpiry ?? prev.motExpiry,
        taxExpiry: isSornFromDVLA ? "" : (dvla.taxDueDate ?? dvla.taxExpiry ?? prev.taxExpiry),

        // flags
        isSorn: isSornFromDVLA ? true : prev.isSorn,
      }));

      toast({
        title: "Vehicle Found!",
        description: "DVLA data loaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Lookup failed",
        description: "Could not fetch DVLA data. Is the server running?",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ IMPORTANT: async + await so Supabase writes before closing
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,

      // enforce flags
      isSorn: !!formData.isSorn,
      isUninsured: !!formData.isUninsured,

      // keep blanks as "" (the new Supabase useVehicles hook converts blanks -> null)
      motExpiry: formData.motExpiry || "",
      taxExpiry: formData.isSorn ? "" : (formData.taxExpiry || ""),
      insuranceExpiry: formData.isUninsured ? "" : (formData.insuranceExpiry || ""),
      insurancePolicyNumber: formData.isUninsured ? "" : (formData.insurancePolicyNumber || ""),
      serviceDate: formData.serviceDate || "",
    };

    try {
      if (initialData) {
        await updateVehicle(initialData.id, payload);
        toast({
          title: "Vehicle Updated",
          description: "Vehicle details have been updated successfully.",
        });
      } else {
        await addVehicle(payload);
        toast({
          title: "Vehicle Added",
          description: "New vehicle has been added to your fleet.",
        });
      }

      onSuccess?.();
    } catch (err) {
      toast({
        title: "Save failed",
        description: String(err?.message || err),
        variant: "destructive",
      });
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
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

      <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary">
        {initialData ? "Update Vehicle" : "Add Vehicle"}
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