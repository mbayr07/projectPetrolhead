import React from 'react';
import { motion } from 'framer-motion';
import { Car, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VehicleCard({ vehicle }) {
  const navigate = useNavigate();

  const parseDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  };

  const fmt = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return 'No data';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getStatus = () => {
    const now = new Date();

    const daysUntil = (dateStr) => {
      const d = parseDate(dateStr);
      if (!d) return null;
      return Math.floor((d - now) / (1000 * 60 * 60 * 24));
    };

    const motDays = daysUntil(vehicle.motExpiry);
    const taxDays = vehicle.isSorn ? null : daysUntil(vehicle.taxExpiry);
    const insDays = vehicle.isUninsured ? null : daysUntil(vehicle.insuranceExpiry);

    const expired =
      (motDays !== null && motDays < 0) ||
      (taxDays !== null && taxDays < 0) ||
      (insDays !== null && insDays < 0);

    const warning =
      (motDays !== null && motDays >= 0 && motDays < 30) ||
      (taxDays !== null && taxDays >= 0 && taxDays < 30) ||
      (insDays !== null && insDays >= 0 && insDays < 30);

    if (expired) return { icon: AlertTriangle, color: 'text-red-500' };
    if (warning) return { icon: Clock, color: 'text-yellow-500' };
    return { icon: CheckCircle, color: 'text-green-500' };
  };

  const { icon: StatusIcon, color } = getStatus();

  const cols = 1 + (vehicle.isSorn ? 0 : 1) + (vehicle.isUninsured ? 0 : 1);

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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">{vehicle.nickname}</h3>

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
              <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
            </div>
          </div>

          <StatusIcon className={`h-6 w-6 ${color} warning-light`} />
        </div>

        <div className={`grid gap-2 text-xs ${cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-muted-foreground mb-1">MOT</div>
            <div className="font-semibold">{fmt(vehicle.motExpiry)}</div>
          </div>

          {!vehicle.isSorn && (
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-muted-foreground mb-1">Tax</div>
              <div className="font-semibold">{fmt(vehicle.taxExpiry)}</div>
            </div>
          )}

          {!vehicle.isUninsured && (
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-muted-foreground mb-1">Insurance</div>
              <div className="font-semibold">{fmt(vehicle.insuranceExpiry)}</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}