import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`vg_reminders_${user.id}`);
      if (stored) {
        setReminders(JSON.parse(stored));
      } else {
        const defaultReminders = [
          {
            id: '1',
            vehicleId: '1',
            type: 'mot',
            dueDate: '2025-06-15',
            notifyDays: 30,
            enabled: true,
            emailSent: false
          },
          {
            id: '2',
            vehicleId: '2',
            type: 'mot',
            dueDate: '2025-01-08',
            notifyDays: 14,
            enabled: true,
            emailSent: false
          }
        ];
        localStorage.setItem(`vg_reminders_${user.id}`, JSON.stringify(defaultReminders));
        setReminders(defaultReminders);
      }
    }
  }, [user]);

  const saveReminders = (newReminders) => {
    if (user) {
      localStorage.setItem(`vg_reminders_${user.id}`, JSON.stringify(newReminders));
      setReminders(newReminders);
    }
  };

  const addReminder = (reminderData) => {
    const newReminder = {
      id: Date.now().toString(),
      ...reminderData,
      emailSent: false
    };
    saveReminders([...reminders, newReminder]);
    return newReminder;
  };

  const updateReminder = (id, updates) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ...updates } : r);
    saveReminders(updated);
  };

  const deleteReminder = (id) => {
    saveReminders(reminders.filter(r => r.id !== id));
  };

  return {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder
  };
}