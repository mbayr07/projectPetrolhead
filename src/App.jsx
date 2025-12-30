import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider, { useAuth } from "@/context/AuthContext";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import VehicleDetails from "@/pages/VehicleDetails";
import DocumentVault from "@/pages/DocumentVault";
import Reminders from "@/pages/Reminders";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Helmet>
          <title>Vehicle Guardian</title>
          <meta
            name="description"
            content="Manage vehicles with reminders, document storage, and reporting. Vehicle Guardian keeps you organised and compliant."
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <meta name="theme-color" content="#0b0f17" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
        </Helmet>

        <ScrollToTop />

        {/* Phone frame wrapper */}
        <div className="min-h-dvh w-full bg-neutral-900 flex justify-center items-start sm:items-center">
          <div className="w-full max-w-[430px] min-h-dvh bg-background text-foreground shadow-2xl sm:rounded-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vehicle/:id"
                element={
                  <PrivateRoute>
                    <VehicleDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <PrivateRoute>
                    <DocumentVault />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reminders"
                element={
                  <PrivateRoute>
                    <Reminders />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <Reports />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <Toaster />
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}