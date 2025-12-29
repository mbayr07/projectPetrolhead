import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Plus, AlertCircle } from 'lucide-react';
import Layout from '@/components/Layout';
import VehicleCard from '@/components/VehicleCard';
import VehicleForm from '@/components/VehicleForm';
import OnboardingTour from '@/components/OnboardingTour';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVehicles } from '@/hooks/useVehicles';

export default function Dashboard() {
  const { vehicles } = useVehicles();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const getActiveAlerts = () => {
    const now = new Date();
    let alerts = 0;

    const daysDiff = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return null;
      return Math.floor((d - now) / (1000 * 60 * 60 * 24));
    };

    vehicles.forEach(vehicle => {
      const motDays = daysDiff(vehicle.motExpiry);
      const taxDays = vehicle.isSorn ? null : daysDiff(vehicle.taxExpiry);
      const insuranceDays = vehicle.isUninsured ? null : daysDiff(vehicle.insuranceExpiry);

      const hasAlert =
        (motDays !== null && motDays < 30) ||
        (taxDays !== null && taxDays < 30) ||
        (insuranceDays !== null && insuranceDays < 30);

      if (hasAlert) alerts++;
    });

    return alerts;
  };

  const activeAlerts = getActiveAlerts();

  return (
    <Layout>
      <Helmet>
        <title>Dashboard - Vehicle Guardian</title>
        <meta name="description" content="Manage all your vehicles in one place. View MOT, tax, and insurance expiry dates with real-time status indicators." />
      </Helmet>

      <OnboardingTour />

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Vehicles
            </h1>
            <p className="text-muted-foreground">Manage your fleet and stay on top of maintenance</p>
          </div>

          <Button onClick={() => setAddDialogOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {activeAlerts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-bold text-yellow-500">{activeAlerts}</span> vehicle{activeAlerts > 1 ? 's' : ''}{' '}
              {activeAlerts > 1 ? 'have' : 'has'} upcoming expiry dates within 30 days
            </p>
          </motion.div>
        )}

        {vehicles.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No vehicles yet</h3>
            <p className="text-muted-foreground mb-6">Add your first vehicle to get started</p>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <VehicleCard vehicle={vehicle} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm onSuccess={() => setAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}