// src/components/VehicleForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useVehicles } from "@/hooks/useVehicles";

// ✅ KEEP THIS AS DEFAULT EXPORT
export default function VehicleForm({ onSuccess, initialData = null }) {
  // --- your existing VehicleForm code stays EXACTLY the same ---
}


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
        description: "No data returned for this registration.",
        variant: "destructive",
      });
      return;
    }

    // ✅ If DVSA failed, SHOW it instead of pretending success
    if (dvla.motHistoryError) {
      toast({
        title: "MOT lookup failed",
        description: dvla.motHistoryError,
        variant: "destructive",
      });
      return;
    }

    // ✅ DVSA-only test: update ONLY MOT date (precise) if provided
    if (!dvla.motExpiryDate) {
      toast({
        title: "No MOT expiry returned",
        description:
          "DVSA returned no MOT expiry date for this VRM (or the vehicle has no MOT history).",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      motExpiry: dvla.motExpiryDate, // <-- this is the precise date from DVSA
    }));

    toast({
      title: "MOT expiry loaded",
      description: `MOT due: ${dvla.motExpiryDate}`,
    });
  } catch (e) {
    toast({
      title: "Lookup failed",
      description: String(e?.message || e),
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};