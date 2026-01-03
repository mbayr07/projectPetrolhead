import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Download, FileText, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVehicles } from "@/hooks/useVehicles";
import { useDocuments } from "@/hooks/useDocuments";
import { useReminders } from "@/hooks/useReminders";
import { useToast } from "@/components/ui/use-toast";

export default function Reports() {
  const { vehicles } = useVehicles();
  const { documents } = useDocuments();
  const { reminders } = useReminders();
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState("all");

  const handleExportPDF = () => {
    toast({
      title: "🚧 PDF Export Coming Soon",
      description: "PDF export functionality will be available in the next update!",
    });
  };

  const getVehicleStats = (vehicleId) => {
    const vehicleReminders =
      vehicleId === "all" ? reminders : reminders.filter((r) => r.vehicleId === vehicleId);

    const vehicleDocs =
      vehicleId === "all" ? documents : documents.filter((d) => d.vehicleId === vehicleId);

    const now = new Date();
    const upcomingReminders = vehicleReminders.filter((r) => {
      const d = r?.dueDate ? new Date(r.dueDate) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      const daysUntil = Math.floor((d - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    });

    return {
      totalReminders: vehicleReminders.length,
      upcomingReminders: upcomingReminders.length,
      totalDocuments: vehicleDocs.length,
    };
  };

  const stats = getVehicleStats(selectedVehicle);

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

  const badgeClass = (du) => {
    if (du === null) return "bg-muted/30 border-border";
    if (du < 0) return "bg-red-500/10 border-red-500/50";
    if (du < 30) return "bg-yellow-500/10 border-yellow-500/50";
    return "bg-green-500/10 border-green-500/50";
  };

  const badgeText = (du) => {
    if (du === null) return "No data";
    if (du < 0) return "Expired";
    return `${du} days`;
  };

  return (
    <Layout>
      <Helmet>
        <title>Reports - AutoMateAI</title>
        <meta
          name="description"
          content="Generate comprehensive vehicle reports and export them as PDF. Track maintenance history, expenses, and compliance status."
        />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">View comprehensive reports and export data</p>
          </div>

          <Button onClick={handleExportPDF} className="bg-gradient-to-r from-primary to-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* ✅ PHONE-FRAME FRIENDLY: stack filter on small layouts */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Filter by vehicle:</span>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.nickname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ✅ PHONE-FRAME FRIENDLY: always single column */}
        <div className="grid grid-cols-1 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <span className="text-3xl font-bold">{stats.totalDocuments}</span>
            </div>
            <h3 className="font-semibold mb-1">Total Documents</h3>
            <p className="text-sm text-muted-foreground">Stored in vault</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-3xl font-bold">{stats.totalReminders}</span>
            </div>
            <h3 className="font-semibold mb-1">Active Reminders</h3>
            <p className="text-sm text-muted-foreground">Configured alerts</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-500" />
              </div>
              <span className="text-3xl font-bold">{stats.upcomingReminders}</span>
            </div>
            <h3 className="font-semibold mb-1">Upcoming (30 days)</h3>
            <p className="text-sm text-muted-foreground">Due soon</p>
          </motion.div>
        </div>

        <Tabs defaultValue="vehicles" className="space-y-4">
          {/* ✅ make tabs wrap nicely in phone frame */}
          <TabsList className="w-full flex flex-wrap justify-start gap-2 h-auto">
            <TabsTrigger value="vehicles">Vehicle Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            {vehicles
              .filter((v) => selectedVehicle === "all" || v.id === selectedVehicle)
              .map((vehicle, index) => {
                const motDays = daysUntil(vehicle.motExpiry);
                const taxDays = vehicle.isSorn ? null : daysUntil(vehicle.taxExpiry);
                const insuranceDays = vehicle.isUninsured ? null : daysUntil(vehicle.insuranceExpiry);

                return (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-border rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold mb-1 truncate">{vehicle.nickname}</h3>
                        <p className="text-muted-foreground">{vehicle.registrationNumber}</p>

                        <div className="flex gap-2 mt-2 flex-wrap">
                          {vehicle.isSorn && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 font-semibold">
                              SORN
                            </span>
                          )}
                          {vehicle.isUninsured && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-500 font-semibold">
                              NO INSURANCE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ✅ PHONE-FRAME FRIENDLY: stack status cards (not 3 columns) */}
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg border ${badgeClass(motDays)}`}>
                        <div className="text-xs text-muted-foreground mb-1">MOT</div>
                        <div className="font-semibold">{badgeText(motDays)}</div>
                      </div>

                      {!vehicle.isSorn && (
                        <div className={`p-3 rounded-lg border ${badgeClass(taxDays)}`}>
                          <div className="text-xs text-muted-foreground mb-1">Tax</div>
                          <div className="font-semibold">{badgeText(taxDays)}</div>
                        </div>
                      )}

                      {!vehicle.isUninsured && (
                        <div className={`p-3 rounded-lg border ${badgeClass(insuranceDays)}`}>
                          <div className="text-xs text-muted-foreground mb-1">Insurance</div>
                          <div className="font-semibold">{badgeText(insuranceDays)}</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </TabsContent>

          <TabsContent value="compliance">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Compliance Overview</h3>
              <p className="text-muted-foreground">
                All vehicles are being monitored for MOT, tax, and insurance compliance. Automated reminders are set up
                to keep you informed of upcoming expiry dates.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Maintenance History</h3>
              <p className="text-muted-foreground">
                Service records and maintenance history will be displayed here once more data is available.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}