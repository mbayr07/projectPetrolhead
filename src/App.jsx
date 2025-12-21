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

// Mobile UX: when navigating, scroll to top (feels way better on phones)
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use instant scroll to avoid “jank” on mobile transitions
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <Helmet>
        <title>Vehicle Guardian</title>
        <meta
          name="description"
          content="Manage vehicles with reminders, document storage, and reporting. Vehicle Guardian keeps you organised and compliant."
        />

        {/* Mobile-first essentials */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0b0f17" />

        {/* iOS “app-like” behaviour (optional but nice) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Helmet>

      {/* dvh avoids mobile browser address-bar 100vh bugs */}
      <div className="min-h-dvh w-full bg-background text-foreground pb-[env(safe-area-inset-bottom)]">
        <Router>
          <ScrollToTop />

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
        </Router>

        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;