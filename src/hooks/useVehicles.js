import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const MOCK_DVLA_DATA = {
  AB12CDE: {
    make: 'BMW',
    model: 'M3',
    year: 2020,
    color: 'Alpine White',
    fuelType: 'Petrol',
    isSorn: false,
  },
  XY98ZAB: {
    make: 'Audi',
    model: 'A4',
    year: 2019,
    color: 'Mythos Black',
    fuelType: 'Diesel',
    isSorn: true,
  }
};

export function useVehicles() {
  // ✅ Guard against useAuth() returning undefined (prevents black screen)
  const auth = typeof useAuth === 'function' ? useAuth() : null;
  const user = auth?.user || null;

  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // If no user yet, don't try to read/write localStorage
    if (!user?.id) {
      setVehicles([]);
      return;
    }

    const key = `vg_vehicles_${user.id}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      const parsed = JSON.parse(stored);

      // ✅ Backwards-compatible migration
      const migrated = parsed.map(v => ({
        isSorn: false,
        isUninsured: false,
        insurancePolicyNumber: '',
        ...v,
      }));

      setVehicles(migrated);
      localStorage.setItem(key, JSON.stringify(migrated));
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
          insurancePolicyNumber: 'VG-TEST-001',
          isUninsured: false,
          serviceDate: '2024-11-05',
          isSorn: false,
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
          taxExpiry: '',
          insuranceExpiry: '',
          insurancePolicyNumber: '',
          isUninsured: true,
          serviceDate: '2024-10-20',
          isSorn: true,
          status: 'warning',
          lastUpdated: new Date().toISOString()
        }
      ];

      localStorage.setItem(key, JSON.stringify(defaultVehicles));
      setVehicles(defaultVehicles);
    }
  }, [user?.id]);

  const saveVehicles = (newVehicles) => {
    if (!user?.id) return;
    localStorage.setItem(`vg_vehicles_${user.id}`, JSON.stringify(newVehicles));
    setVehicles(newVehicles);
  };

  const addVehicle = (vehicleData) => {
    const newVehicle = {
      id: Date.now().toString(),
      isSorn: false,
      isUninsured: false,
      insurancePolicyNumber: '',
      ...vehicleData,
      taxExpiry: vehicleData?.isSorn ? '' : (vehicleData?.taxExpiry || ''),
      insuranceExpiry: vehicleData?.isUninsured ? '' : (vehicleData?.insuranceExpiry || ''),
      insurancePolicyNumber: vehicleData?.isUninsured ? '' : (vehicleData?.insurancePolicyNumber || ''),
      status: 'active',
      lastUpdated: new Date().toISOString()
    };

    saveVehicles([...vehicles, newVehicle]);
    return newVehicle;
  };

  const updateVehicle = (id, updates) => {
    const updated = vehicles.map(v =>
      v.id === id
        ? {
            ...v,
            ...updates,
            isSorn: !!updates?.isSorn,
            isUninsured: !!updates?.isUninsured,
            taxExpiry: updates?.isSorn ? '' : (updates?.taxExpiry ?? v.taxExpiry),
            insuranceExpiry: updates?.isUninsured ? '' : (updates?.insuranceExpiry ?? v.insuranceExpiry),
            insurancePolicyNumber: updates?.isUninsured ? '' : (updates?.insurancePolicyNumber ?? v.insurancePolicyNumber),
            lastUpdated: new Date().toISOString()
          }
        : v
    );
    saveVehicles(updated);
  };

  const deleteVehicle = (id) => {
    saveVehicles(vehicles.filter(v => v.id !== id));
  };

  // ✅ REAL DVLA LOOKUP (via your local proxy server)
  const lookupDVLA = async (registrationNumber) => {
    const clean = String(registrationNumber || '').replace(/\s+/g, '').toUpperCase();
    if (!clean) return null;

    try {
      const res = await fetch(`/api/dvla/${clean}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return MOCK_DVLA_DATA[clean] || null;
    }
  };

  return {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    lookupDVLA
  };
}