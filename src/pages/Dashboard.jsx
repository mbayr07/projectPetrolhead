// src/pages/Dashboard.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Plus, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import VehicleCard from "@/components/VehicleCard";
import VehicleForm from "@/components/VehicleForm";
// import OnboardingTour from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVehicles } from "@/hooks/useVehicles";

export default function Dashboard() {
  const { vehicles } = useVehicles();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const getActiveAlerts = () => {
    const now = new Date();
    let alerts = 0;

    const daysDiff = (date) => Math.floor((date - now) / (1000 * 60 * 60 * 24));

    vehicles.forEach((vehicle) => {
      const motDate = vehicle.motExpiry ? new Date(vehicle.motExpiry) : null;
      const taxDate = vehicle.taxExpiry ? new Date(vehicle.taxExpiry) : null;
      const insuranceDate = vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry) : null;

      const motDays = motDate ? daysDiff(motDate) : null;
      const taxDays = vehicle.isSorn ? null : taxDate ? daysDiff(taxDate) : null;
      const insDays = vehicle.isUninsured ? null : insuranceDate ? daysDiff(insuranceDate) : null;

      const warn =
        (motDays !== null && motDays < 30) ||
        (taxDays !== null && taxDays < 30) ||
        (insDays !== null && insDays < 30);

      if (warn) alerts++;
    });

    return alerts;
  };

  const activeAlerts = getActiveAlerts();

  return (
    <Layout>
      <Helmet>
        <title>Dashboard - Vehicle Guardian</title>
        <meta
          name="description"
          content="Manage all your vehicles in one place. View MOT, tax, and insurance expiry dates with real-time status indicators."
        />
      </Helmet>

      {/* <OnboardingTour /> */}

      <div className="space-y-4">
        {/* Header (more compact) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Vehicles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay on top of MOT, tax, insurance & service.
            </p>
          </div>

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-secondary h-9 px-3 text-sm shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Alert banner (slimmer) */}
        {activeAlerts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/35 rounded-xl px-3 py-2 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-yellow-500">{activeAlerts}</span>{" "}
              vehicle{activeAlerts > 1 ? "s" : ""} with an expiry within{" "}
              <span className="font-semibold">30 days</span>.
            </p>
          </motion.div>
        )}

        {/* Empty state (more compact) */}
        {vehicles.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-3">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No vehicles yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first vehicle to get started.
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary h-10 px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.06, 0.24) }}
              >
                <VehicleCard vehicle={vehicle} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          className="max-w-[420px] max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            const t = e.target;
            if (t?.closest?.("[data-filepicker]") || t?.closest?.('input[type="file"]')) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const t = e.target;
            if (t?.closest?.("[data-filepicker]") || t?.closest?.('input[type="file"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm onSuccess={() => setAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}