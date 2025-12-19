import React from 'react';
import { motion } from 'framer-motion';
import { Car, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VehicleCard({ vehicle }) {
  const navigate = useNavigate();

  const getStatus = () => {
    const now = new Date();
    const motDate = new Date(vehicle.motExpiry);
    const taxDate = new Date(vehicle.taxExpiry);
    const insuranceDate = new Date(vehicle.insuranceExpiry);
    
    const daysDiff = (date) => Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    const motDays = daysDiff(motDate);
    const taxDays = daysDiff(taxDate);
    const insuranceDays = daysDiff(insuranceDate);
    
    if (motDays < 0 || taxDays < 0 || insuranceDays < 0) {
      return { status: 'expired', icon: AlertTriangle, color: 'text-red-500' };
    } else if (motDays < 30 || taxDays < 30 || insuranceDays < 30) {
      return { status: 'warning', icon: Clock, color: 'text-yellow-500' };
    }
    return { status: 'active', icon: CheckCircle, color: 'text-green-500' };
  };

  const statusInfo = getStatus();
  const StatusIcon = statusInfo.icon;

  const getHealthPercentage = () => {
    const now = new Date();
    const motDate = new Date(vehicle.motExpiry);
    const taxDate = new Date(vehicle.taxExpiry);
    const insuranceDate = new Date(vehicle.insuranceExpiry);
    
    const daysDiff = (date) => Math.max(0, Math.floor((date - now) / (1000 * 60 * 60 * 24)));
    
    const motDays = daysDiff(motDate);
    const taxDays = daysDiff(taxDate);
    const insuranceDays = daysDiff(insuranceDate);
    
    const avgDays = (motDays + taxDays + insuranceDays) / 3;
    return Math.min(100, Math.floor((avgDays / 365) * 100));
  };

  const healthPercentage = getHealthPercentage();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/vehicle/${vehicle.id}`)}
      className="bg-card border border-border rounded-xl p-6 cursor-pointer relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{vehicle.nickname}</h3>
              <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
            </div>
          </div>
          <StatusIcon className={`h-6 w-6 ${statusInfo.color} warning-light`} />
        </div>

        <div className="space-y-3 mb-4">
          <div className="text-sm text-muted-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </div>
          
          {/* Gauge-style health indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Vehicle Health</span>
              <span className="font-bold">{healthPercentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full gauge-gradient"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground mb-1">MOT</div>
            <div className="font-semibold">{new Date(vehicle.motExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground mb-1">Tax</div>
            <div className="font-semibold">{new Date(vehicle.taxExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground mb-1">Insurance</div>
            <div className="font-semibold">{new Date(vehicle.insuranceExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}