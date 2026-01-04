import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  Car,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Dashboard / Docs / Crash / Profile
  const tabs = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
    { icon: FileText, label: "Docs", path: "/documents" },
    { icon: AlertTriangle, label: "Crash", path: "/crash", danger: true },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";
  };

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname.startsWith("/vehicle/");
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="h-full bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="h-14 shrink-0 bg-card border-b border-border flex items-center px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Car className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AutoMateAI
          </span>
        </Link>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-2 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user?.name || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 pb-6">{children}</div>
        <div className="h-4" />
      </main>

      {/* Bottom Nav */}
      <nav className="shrink-0 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="px-2">
          <div className="h-[64px] flex items-center justify-between">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);

              // Special styling for Crash tab
              const danger = !!tab.danger;

              return (
                <Link key={tab.path} to={tab.path} className="flex-1" aria-label={tab.label}>
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className={`mx-1 rounded-xl px-2 py-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                      danger
                        ? active
                          ? "border border-red-500/50 bg-red-500/20 text-red-200"
                          : "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                        : active
                        ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${danger ? "text-red-300" : ""}`} />
                    <span className="text-[11px] font-medium leading-none">{tab.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}