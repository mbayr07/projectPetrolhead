import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { Car, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please ensure both passwords are the same.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await signup(formData.email, formData.password, formData.name);

      toast({
        title: "Account created!",
        description: "Check your email if confirmation is enabled in Supabase.",
      });

      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Signup failed",
        description: err?.message || "Please try again.",
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
    } catch (err) {
      toast({
        title: "Google signup failed",
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
        <title>Sign Up - AutoMateAI</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/10" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Create Account</h1>
              <p className="text-muted-foreground text-center text-sm">Start managing your vehicles today</p>
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
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="John Doe" className="pl-10" required />
                </div>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary h-11" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}