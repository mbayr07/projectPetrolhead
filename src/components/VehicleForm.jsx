import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useVehicles } from '@/hooks/useVehicles';

export default function VehicleForm({ onSuccess, initialData = null }) {
  const { addVehicle, updateVehicle, lookupDVLA } = useVehicles();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {
    registrationNumber: '',
    nickname: '',
    make: '',
    model: '',
    year: '',
    color: '',
    fuelType: '',
    mileage: '',
    motExpiry: '',
    taxExpiry: '',
    insuranceExpiry: '',
    serviceDate: ''
  });

  const handleDVLALookup = async () => {
    if (!formData.registrationNumber) {
      toast({
        title: 'Registration Required',
        description: 'Please enter a registration number first.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      const dvlaData = lookupDVLA(formData.registrationNumber);
      
      if (dvlaData) {
        setFormData(prev => ({
          ...prev,
          ...dvlaData
        }));
        toast({
          title: 'Vehicle Found!',
          description: 'DVLA data loaded successfully (mock data)',
        });
      } else {
        toast({
          title: 'Not Found',
          description: 'No DVLA data available for this registration (try AB12CDE or XY98ZAB)',
          variant: 'destructive'
        });
      }
      
      setLoading(false);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (initialData) {
      updateVehicle(initialData.id, formData);
      toast({
        title: 'Vehicle Updated',
        description: 'Vehicle details have been updated successfully.',
      });
    } else {
      addVehicle(formData);
      toast({
        title: 'Vehicle Added',
        description: 'New vehicle has been added to your fleet.',
      });
    }
    
    onSuccess?.();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
            <Button
              type="button"
              onClick={handleDVLALookup}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              name="make"
              value={formData.make}
              onChange={handleChange}
              placeholder="BMW"
              required
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="M3"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleChange}
              placeholder="2020"
              required
            />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="Alpine White"
            />
          </div>
          <div>
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Input
              id="fuelType"
              name="fuelType"
              value={formData.fuelType}
              onChange={handleChange}
              placeholder="Petrol"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="mileage">Mileage</Label>
          <Input
            id="mileage"
            name="mileage"
            type="number"
            value={formData.mileage}
            onChange={handleChange}
            placeholder="15000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="motExpiry">MOT Expiry</Label>
            <Input
              id="motExpiry"
              name="motExpiry"
              type="date"
              value={formData.motExpiry}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="taxExpiry">Tax Expiry</Label>
            <Input
              id="taxExpiry"
              name="taxExpiry"
              type="date"
              value={formData.taxExpiry}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
            <Input
              id="insuranceExpiry"
              name="insuranceExpiry"
              type="date"
              value={formData.insuranceExpiry}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="serviceDate">Last Service</Label>
            <Input
              id="serviceDate"
              name="serviceDate"
              type="date"
              value={formData.serviceDate}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-primary to-secondary"
        >
          {initialData ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}