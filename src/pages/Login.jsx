import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { Car, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(formData.email, formData.password);
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Login Failed",
        description: err?.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      // Redirect handled by Supabase, you’ll come back logged in
    } catch (err) {
      toast({
        title: "Google login failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <>
      <Helmet>
        <title>Login - AutoMateAI</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Welcome Back</h1>
              <p className="text-muted-foreground text-center text-sm">Login to access your vehicle dashboard</p>
            </div>

            <div className="space-y-3 mb-4">
              <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogle} disabled={loading}>
                Continue with Google
              </Button>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary h-11" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}