import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const tourSteps = [
  {
    title: 'Welcome to Vehicle Guardian! 🚗',
    description: 'Your complete vehicle management solution. Let\'s take a quick tour to get you started.',
    highlight: null
  },
  {
    title: 'Dashboard Overview',
    description: 'View all your vehicles at a glance with real-time status indicators showing MOT, tax, and insurance expiry dates.',
    highlight: 'dashboard'
  },
  {
    title: 'Document Vault',
    description: 'Securely store all your vehicle documents in one place. Upload insurance certificates, service records, and more.',
    highlight: 'documents'
  },
  {
    title: 'Automated Reminders',
    description: 'Never miss important dates! Set up email reminders for MOT, tax, insurance, and service appointments.',
    highlight: 'reminders'
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate comprehensive reports and export them as PDFs. Track expenses, maintenance history, and more.',
    highlight: 'reports'
  }
];

export default function OnboardingTour() {
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user && !user.hasSeenTour) {
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    updateUser({ hasSeenTour: true });
  };

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100]"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md mx-4"
          >
            <div className="bg-card border-2 border-primary rounded-xl p-6 shadow-2xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="ml-2 -mt-1"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                    {currentStep < tourSteps.length - 1 && (
                      <ChevronRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}