import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Gauge,
  Droplet,
  Palette,
  FileText,
} from "lucide-react";
import Layout from "@/components/Layout";
import VehicleForm from "@/components/VehicleForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/components/ui/use-toast";

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, deleteVehicle } = useVehicles();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const vehicle = vehicles.find((v) => String(v.id) === String(id));

  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Vehicle not found</h2>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const parseDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  };

  const daysUntil = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return null;
    const now = new Date();
    return Math.floor((d - now) / (1000 * 60 * 60 * 24));
  };

  const formatFull = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return "No data held";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  const expiryItems = [
    { label: "MOT", date: vehicle.motExpiry, applicable: true },
    { label: "Tax", date: vehicle.taxExpiry, applicable: !vehicle.isSorn },
    { label: "Insurance", date: vehicle.insuranceExpiry, applicable: !vehicle.isUninsured },
    { label: "Last Service", date: vehicle.serviceDate, applicable: true },
  ].filter((i) => i.applicable);

  const handleDelete = () => {
    deleteVehicle(id);
    toast({ title: "Vehicle Deleted", description: "Vehicle has been removed from your fleet." });
    navigate("/dashboard");
  };

  // Robust display helpers
  const safeText = (v, fallback = "No data held") => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length ? s : fallback;
  };

  const safeMileage = () => {
    const m = vehicle.mileage;
    if (m === null || m === undefined || String(m).trim() === "") return "No data held";
    const n = Number(String(m).replace(/,/g, ""));
    if (Number.isNaN(n)) return safeText(m);
    return `${n.toLocaleString()} miles`;
  };

  return (
    <Layout>
      <Helmet>
        <title>{safeText(vehicle.nickname, "Vehicle")} - AutoMateAI</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {safeText(vehicle.nickname, "Vehicle")}
              </h1>

              {vehicle.isSorn && (
                <span className="text-xs px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 font-semibold">
                  SORN
                </span>
              )}

              {vehicle.isUninsured && (
                <span className="text-xs px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-500 font-semibold">
                  NO INSURANCE
                </span>
              )}
            </div>

            <p className="text-muted-foreground break-all">
              {safeText(vehicle.registrationNumber, "")}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ✅ MOBILE ONLY: no md:grid-cols-2 */}
        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold mb-4">Vehicle Information</h2>

            <div className="space-y-3">
              <InfoRow
                icon={FileText}
                label="Make & Model"
                value={safeText(`${vehicle.make || ""} ${vehicle.model || ""}`.trim())}
              />
              <InfoRow icon={Calendar} label="Year" value={safeText(vehicle.year)} />
              <InfoRow icon={Palette} label="Color" value={safeText(vehicle.color)} />
              <InfoRow icon={Droplet} label="Fuel Type" value={safeText(vehicle.fuelType)} />
              <InfoRow icon={Gauge} label="Mileage" value={safeMileage()} />

              {!vehicle.isUninsured &&
                vehicle.insurancePolicyNumber &&
                String(vehicle.insurancePolicyNumber).trim() && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="text-sm text-muted-foreground">Insurance Policy Number</div>
                    <div className="font-semibold break-all">
                      {String(vehicle.insurancePolicyNumber)}
                    </div>
                  </div>
                )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold mb-4">Dates</h2>

            <div className="space-y-4">
              {expiryItems.map((item) => {
                const du = daysUntil(item.date);
                const hasDate = du !== null;

                const isExpired = hasDate && du < 0;
                const isWarning = hasDate && du >= 0 && du < 30;

                const boxClass = !hasDate
                  ? "bg-muted/30 border-border"
                  : isExpired
                  ? "bg-red-500/10 border-red-500/50"
                  : isWarning
                  ? "bg-yellow-500/10 border-yellow-500/50"
                  : "bg-green-500/10 border-green-500/50";

                const rightText = !hasDate ? "No data" : isExpired ? "Expired" : `${du} days`;

                const rightColor = !hasDate
                  ? "text-muted-foreground"
                  : isExpired
                  ? "text-red-500"
                  : isWarning
                  ? "text-yellow-500"
                  : "text-green-500";

                return (
                  <div key={item.label} className={`p-4 rounded-lg border ${boxClass}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-muted-foreground">{formatFull(item.date)}</div>
                        {!hasDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Add the date to enable reminders.
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-semibold whitespace-nowrap ${rightColor}`}>
                        {rightText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setEditDialogOpen(true)}>
              Add / update dates
            </Button>
          </motion.div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm initialData={vehicle} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {safeText(vehicle.nickname, "this vehicle")} and all
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-semibold break-words">{String(value ?? "")}</div>
      </div>
    </div>
  );
}