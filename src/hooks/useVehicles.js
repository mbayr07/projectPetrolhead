import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const MOCK_DVLA_DATA = {
  'AB12CDE': {
    make: 'BMW',
    model: 'M3',
    year: 2020,
    color: 'Alpine White',
    fuelType: 'Petrol'
  },
  'XY98ZAB': {
    make: 'Audi',
    model: 'A4',
    year: 2019,
    color: 'Mythos Black',
    fuelType: 'Diesel'
  }
};

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`vg_vehicles_${user.id}`);
      if (stored) {
        setVehicles(JSON.parse(stored));
      } else {
        const defaultVehicles = [
          {
            id: '1',
            registrationNumber: 'AB12CDE',
            nickname: 'My M3',
            make: 'BMW',
            model: 'M3',
            year: 2020,
            color: 'Alpine White',
            fuelType: 'Petrol',
            mileage: 15420,
            motExpiry: '2025-06-15',
            taxExpiry: '2025-03-20',
            insuranceExpiry: '2025-04-10',
            serviceDate: '2024-11-05',
            status: 'active',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '2',
            registrationNumber: 'XY98ZAB',
            nickname: 'Daily Driver',
            make: 'Audi',
            model: 'A4',
            year: 2019,
            color: 'Mythos Black',
            fuelType: 'Diesel',
            mileage: 42350,
            motExpiry: '2025-01-08',
            taxExpiry: '2025-02-28',
            insuranceExpiry: '2025-05-15',
            serviceDate: '2024-10-20',
            status: 'warning',
            lastUpdated: new Date().toISOString()
          }
        ];
        localStorage.setItem(`vg_vehicles_${user.id}`, JSON.stringify(defaultVehicles));
        setVehicles(defaultVehicles);
      }
    }
  }, [user]);

  const saveVehicles = (newVehicles) => {
    if (user) {
      localStorage.setItem(`vg_vehicles_${user.id}`, JSON.stringify(newVehicles));
      setVehicles(newVehicles);
    }
  };

  const addVehicle = (vehicleData) => {
    const newVehicle = {
      id: Date.now().toString(),
      ...vehicleData,
      status: 'active',
      lastUpdated: new Date().toISOString()
    };
    saveVehicles([...vehicles, newVehicle]);
    return newVehicle;
  };

  const updateVehicle = (id, updates) => {
    const updated = vehicles.map(v => 
      v.id === id ? { ...v, ...updates, lastUpdated: new Date().toISOString() } : v
    );
    saveVehicles(updated);
  };

  const deleteVehicle = (id) => {
    saveVehicles(vehicles.filter(v => v.id !== id));
  };

  const lookupDVLA = (registrationNumber) => {
    return MOCK_DVLA_DATA[registrationNumber.toUpperCase()] || null;
  };

  return {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    lookupDVLA
  };
}