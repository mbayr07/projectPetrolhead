import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider, { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import VehicleDetails from '@/pages/VehicleDetails';
import DocumentVault from '@/pages/DocumentVault';
import Reminders from '@/pages/Reminders';
import Reports from '@/pages/Reports';
import Profile from '@/pages/Profile';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Helmet>
        <title>Vehicle Guardian - Complete Vehicle Management System</title>
        <meta name="description" content="Manage your vehicles with automated reminders, document storage, and comprehensive reporting. Vehicle Guardian keeps your fleet organized and compliant." />
      </Helmet>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/vehicle/:id" element={<PrivateRoute><VehicleDetails /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentVault /></PrivateRoute>} />
          <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;