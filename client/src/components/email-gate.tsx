import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, Loader2, Inbox, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { subscribeRequestSchema, type SubscribeRequest } from "@shared/models";
import {
  acknowledgeConfirmation,
  dismissConfirmationBanner,
  getStoredEmail,
  isConfirmationAcknowledged,
  markEmailConfirmed,
  savePendingSubscription,
  shouldShowConfirmationBanner,
} from "@/lib/subscription-storage";

interface EmailGateProps {
  children: React.ReactNode;
}

export function EmailGate({ children }: EmailGateProps) {
  const { toast } = useToast();
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => getStoredEmail());
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(() =>
    isConfirmationAcknowledged(),
  );
  const [showConfirmationBanner, setShowConfirmationBanner] = useState(() =>
    shouldShowConfirmationBanner(),
  );

  const form = useForm<SubscribeRequest>({
    resolver: zodResolver(subscribeRequestSchema),
    defaultValues: { email: "" },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeRequest) => {
      const response = await apiRequest("POST", "/api/subscribe", data);
      return response.json() as Promise<{ success: boolean; email: string; requiresConfirmation?: boolean }>;
    },
    onSuccess: (data) => {
      savePendingSubscription(data.email);
      setSubscribedEmail(data.email);
      setConfirmationAcknowledged(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please check your email and try again.",
        variant: "destructive",
      });
    },
  });

  const handleContinueToGenerator = () => {
    acknowledgeConfirmation();
    setConfirmationAcknowledged(true);
    setShowConfirmationBanner(shouldShowConfirmationBanner());
  };

  const handleDismissBanner = () => {
    dismissConfirmationBanner();
    setShowConfirmationBanner(false);
  };

  const handleConfirmEmail = () => {
    markEmailConfirmed();
    setShowConfirmationBanner(false);
  };

  if (subscribedEmail && confirmationAcknowledged) {
    return (
      <>
        {showConfirmationBanner && (
          <Alert className="relative mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <Mail className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-900">Confirm your subscription</AlertTitle>
            <AlertDescription className="text-amber-800 pr-8">
              <p className="mb-3">
                Check your email and click the confirmation link to complete your subscription.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConfirmEmail}
                className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              >
                I&apos;ve confirmed my email
              </Button>
            </AlertDescription>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="absolute right-3 top-3 rounded-md p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}
        {children}
      </>
    );
  }

  if (subscribedEmail && !confirmationAcknowledged) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
          {children}
        </div>

        <div className="absolute inset-0 z-10 flex items-start justify-center pt-12 px-4">
          <Card className="w-full max-w-md shadow-xl border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center">
                  <Inbox className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Almost done!</h3>
                  <p className="text-sm text-slate-600">One more step to join the list</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 mb-6">
                Check your inbox for a confirmation email. Click the link to confirm,
                then return here. You can use the generator while you wait.
              </p>

              <Button
                type="button"
                onClick={handleContinueToGenerator}
                className="w-full bg-brand-blue hover:bg-blue-700"
              >
                Continue to Generator
              </Button>

              <p className="text-xs text-slate-500 mt-4 text-center">
                Didn&apos;t get the email? Check your spam folder.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-start justify-center pt-12 px-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center">
                <Mail className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Enter your email to continue</h3>
                <p className="text-sm text-slate-600">Get free access to the Poshmark letter generator</p>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => subscribeMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          {...field}
                          className="transition-all duration-200 focus:ring-2 focus:ring-brand-blue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={subscribeMutation.isPending}
                  className="w-full bg-brand-blue hover:bg-blue-700"
                >
                  {subscribeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    "Unlock Generator"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-xs text-slate-500 mt-4 text-center">
              We&apos;ll send you helpful tips. Unsubscribe anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
