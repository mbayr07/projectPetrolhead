import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar,
  Gauge,
  Droplet,
  Palette,
  FileText
} from 'lucide-react';
import Layout from '@/components/Layout';
import VehicleForm from '@/components/VehicleForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVehicles } from '@/hooks/useVehicles';
import { useToast } from '@/components/ui/use-toast';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, deleteVehicle } = useVehicles();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Vehicle not found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const handleDelete = () => {
    deleteVehicle(id);
    toast({
      title: 'Vehicle Deleted',
      description: 'Vehicle has been removed from your fleet.',
    });
    navigate('/dashboard');
  };

  const getDaysUntil = (date) => {
    const now = new Date();
    const target = new Date(date);
    return Math.floor((target - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <Layout>
      <Helmet>
        <title>{vehicle.nickname} - Vehicle Guardian</title>
        <meta name="description" content={`Detailed information and maintenance history for ${vehicle.nickname} (${vehicle.registrationNumber})`} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {vehicle.nickname}
            </h1>
            <p className="text-muted-foreground">{vehicle.registrationNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setEditDialogOpen(true)}
            >
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold mb-4">Vehicle Information</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Make & Model</div>
                  <div className="font-semibold">{vehicle.make} {vehicle.model}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Year</div>
                  <div className="font-semibold">{vehicle.year}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Color</div>
                  <div className="font-semibold">{vehicle.color}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Droplet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Fuel Type</div>
                  <div className="font-semibold">{vehicle.fuelType}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mileage</div>
                  <div className="font-semibold">{vehicle.mileage?.toLocaleString()} miles</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold mb-4">Expiry Dates</h2>
            
            <div className="space-y-4">
              {[
                { label: 'MOT', date: vehicle.motExpiry },
                { label: 'Tax', date: vehicle.taxExpiry },
                { label: 'Insurance', date: vehicle.insuranceExpiry },
                { label: 'Last Service', date: vehicle.serviceDate }
              ].map((item) => {
                const daysUntil = getDaysUntil(item.date);
                const isExpired = daysUntil < 0;
                const isWarning = daysUntil >= 0 && daysUntil < 30;
                
                return (
                  <div
                    key={item.label}
                    className={`p-4 rounded-lg border ${
                      isExpired
                        ? 'bg-red-500/10 border-red-500/50'
                        : isWarning
                        ? 'bg-yellow-500/10 border-yellow-500/50'
                        : 'bg-green-500/10 border-green-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        isExpired
                          ? 'text-red-500'
                          : isWarning
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}>
                        {isExpired
                          ? 'Expired'
                          : `${daysUntil} days`
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm
            initialData={vehicle}
            onSuccess={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {vehicle.nickname} and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}