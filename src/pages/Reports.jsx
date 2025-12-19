import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Download, FileText, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicles } from '@/hooks/useVehicles';
import { useDocuments } from '@/hooks/useDocuments';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/components/ui/use-toast';

export default function Reports() {
  const { vehicles } = useVehicles();
  const { documents } = useDocuments();
  const { reminders } = useReminders();
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState('all');

  const handleExportPDF = () => {
    toast({
      title: '🚧 PDF Export Coming Soon',
      description: 'PDF export functionality will be available in the next update!',
    });
  };

  const getVehicleStats = (vehicleId) => {
    const vehicleReminders = vehicleId === 'all'
      ? reminders
      : reminders.filter(r => r.vehicleId === vehicleId);
    
    const vehicleDocs = vehicleId === 'all'
      ? documents
      : documents.filter(d => d.vehicleId === vehicleId);

    const now = new Date();
    const upcomingReminders = vehicleReminders.filter(r => {
      const daysUntil = Math.floor((new Date(r.dueDate) - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    });

    return {
      totalReminders: vehicleReminders.length,
      upcomingReminders: upcomingReminders.length,
      totalDocuments: vehicleDocs.length
    };
  };

  const stats = getVehicleStats(selectedVehicle);

  return (
    <Layout>
      <Helmet>
        <title>Reports - Vehicle Guardian</title>
        <meta name="description" content="Generate comprehensive vehicle reports and export them as PDF. Track maintenance history, expenses, and compliance status." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">
              View comprehensive reports and export data
            </p>
          </div>
          
          <Button
            onClick={handleExportPDF}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <span className="text-sm text-muted-foreground">Filter by vehicle:</span>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(vehicle => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.nickname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
          <TabsList>
            <TabsTrigger value="vehicles">Vehicle Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            {vehicles.map((vehicle, index) => {
              const now = new Date();
              const motDays = Math.floor((new Date(vehicle.motExpiry) - now) / (1000 * 60 * 60 * 24));
              const taxDays = Math.floor((new Date(vehicle.taxExpiry) - now) / (1000 * 60 * 60 * 24));
              const insuranceDays = Math.floor((new Date(vehicle.insuranceExpiry) - now) / (1000 * 60 * 60 * 24));

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{vehicle.nickname}</h3>
                      <p className="text-muted-foreground">{vehicle.registrationNumber}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-3 rounded-lg border ${
                      motDays < 0 ? 'bg-red-500/10 border-red-500/50' : motDays < 30 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-green-500/10 border-green-500/50'
                    }`}>
                      <div className="text-xs text-muted-foreground mb-1">MOT</div>
                      <div className="font-semibold">{motDays < 0 ? 'Expired' : `${motDays} days`}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      taxDays < 0 ? 'bg-red-500/10 border-red-500/50' : taxDays < 30 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-green-500/10 border-green-500/50'
                    }`}>
                      <div className="text-xs text-muted-foreground mb-1">Tax</div>
                      <div className="font-semibold">{taxDays < 0 ? 'Expired' : `${taxDays} days`}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      insuranceDays < 0 ? 'bg-red-500/10 border-red-500/50' : insuranceDays < 30 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-green-500/10 border-green-500/50'
                    }`}>
                      <div className="text-xs text-muted-foreground mb-1">Insurance</div>
                      <div className="font-semibold">{insuranceDays < 0 ? 'Expired' : `${insuranceDays} days`}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="compliance">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Compliance Overview</h3>
              <p className="text-muted-foreground">
                All vehicles are being monitored for MOT, tax, and insurance compliance.
                Automated reminders are set up to keep you informed of upcoming expiry dates.
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