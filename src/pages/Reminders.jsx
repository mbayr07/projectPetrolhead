import React from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Bell, Calendar, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function Reminders() {
  const { toast } = useToast();

  return (
    <Layout>
      <Helmet>
        <title>Reminders - Vehicle Guardian</title>
        <meta
          name="description"
          content="Manage reminders for MOT, tax, insurance, and servicing."
        />
      </Helmet>

      {/* ✅ Phone-frame friendly wrapper */}
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Reminders
          </h1>
          <p className="text-muted-foreground">
            Stay on top of important vehicle deadlines
          </p>
        </div>

        {/* Empty state */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 text-center space-y-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>

          <h3 className="text-xl font-semibold">No reminders yet</h3>
          <p className="text-sm text-muted-foreground">
            Reminders will automatically appear once you add dates for MOT, tax,
            insurance, or servicing.
          </p>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "ℹ️ Automatic reminders",
                description:
                  "Reminders are created automatically when you add vehicle dates.",
              })
            }
          >
            Learn how reminders work
          </Button>
        </motion.div>

        {/* Future placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-2">Coming soon</h3>
              <p className="text-sm text-muted-foreground">
                Custom reminders, push notifications, and calendar sync will be
                available in a future update.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}