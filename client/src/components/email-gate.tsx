import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { subscribeRequestSchema, type SubscribeRequest } from "@shared/models";

const STORAGE_KEY = "subscribedEmail";

function getStoredEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface EmailGateProps {
  children: React.ReactNode;
}

export function EmailGate({ children }: EmailGateProps) {
  const { toast } = useToast();
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => getStoredEmail());

  const form = useForm<SubscribeRequest>({
    resolver: zodResolver(subscribeRequestSchema),
    defaultValues: { email: "" },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeRequest) => {
      const response = await apiRequest("POST", "/api/subscribe", data);
      return response.json() as Promise<{ success: boolean; email: string }>;
    },
    onSuccess: (data) => {
      localStorage.setItem(STORAGE_KEY, data.email);
      setSubscribedEmail(data.email);
      toast({
        title: "You're all set!",
        description: "The letter generator is now unlocked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please check your email and try again.",
        variant: "destructive",
      });
    },
  });

  if (subscribedEmail) {
    return <>{children}</>;
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
              We'll send you helpful tips. Unsubscribe anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
