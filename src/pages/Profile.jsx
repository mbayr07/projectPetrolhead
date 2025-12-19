import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { User, Mail, Calendar, Database } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSupabaseSetup = () => {
    toast({
      title: '🚧 Supabase Not Connected',
      description: 'To enable persistent storage, please connect your Supabase account through the integration settings.',
    });
  };

  return (
    <Layout>
      <Helmet>
        <title>Profile - Vehicle Guardian</title>
        <meta name="description" content="View and manage your Vehicle Guardian account settings and preferences." />
      </Helmet>

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <h2 className="text-xl font-bold mb-4">Account Information</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-semibold">{user?.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-semibold">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Member Since</div>
                <div className="font-semibold">
                  {new Date(user?.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <Database className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold mb-2">Data Storage</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your data is currently stored locally in your browser using localStorage.
                For production use with persistent storage across devices, connect Supabase.
              </p>
              <Button
                onClick={handleSupabaseSetup}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                Connect Supabase
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}