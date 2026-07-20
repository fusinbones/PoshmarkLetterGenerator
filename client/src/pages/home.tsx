import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateRequestSchema } from "@shared/models";
import { Ban, AlertTriangle, Copy, Wand2, Shield, Clock, Loader2, User, FileText } from "lucide-react";

interface UsageData {
  usageCount: number;
  dailyLimit: number;
  resetDate: string;
}

interface GenerateResponse {
  message: string;
  usageCount: number;
  dailyLimit: number;
}

export default function Home() {
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const { toast } = useToast();

  // Form for collecting user input
  const form = useForm({
    resolver: zodResolver(generateRequestSchema),
    defaultValues: {
      reason: "suspension" as "suspension" | "warning",
      fullName: "",
      closetName: "",
    },
  });

  // Fetch current usage data
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { reason: "suspension" | "warning"; fullName?: string; closetName?: string }) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return response.json() as Promise<GenerateResponse>;
    },
    onSuccess: (data) => {
      setGeneratedTemplate(data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({
        title: "Letter Generated Successfully!",
        description: "Your professional letter template is ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate letter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = (reason: "suspension" | "warning") => {
    if (usageData && usageData.usageCount >= usageData.dailyLimit) {
      toast({
        title: "Daily Limit Reached",
        description: "You've reached your daily limit of 20 generations.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = form.getValues();
    generateMutation.mutate({
      reason,
      fullName: formData.fullName,
      closetName: formData.closetName,
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedTemplate);
      toast({
        title: "Copied to Clipboard!",
        description: "Letter template has been copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const progress = usageData ? (usageData.usageCount / usageData.dailyLimit) * 100 : 0;
  const limitReached = usageData ? usageData.usageCount >= usageData.dailyLimit : false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center">
                <Wand2 className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Sidekick Tools</h1>
                <p className="text-sm text-slate-600">Poshmark Letter Generator</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Daily Usage</div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-slate-900">
                  {usageLoading ? "..." : usageData?.usageCount || 0}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-lg font-semibold text-slate-600">
                  {usageData?.dailyLimit || 20}
                </span>
              </div>
              <div className="w-24 h-2 bg-slate-200 rounded-full mt-1">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    progress >= 90 ? 'bg-red-500' : 
                    progress >= 70 ? 'bg-yellow-500' : 
                    'bg-brand-blue'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Generator Card */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate Poshmark Email Response</h2>
            <p className="text-slate-600">Professional email responses for suspension appeals and warning notices. Copy and paste directly into your reply to Poshmark support.</p>
          </div>

          <CardContent className="p-6">
            {/* Input Form */}
            <Form {...form}>
              <div className="space-y-6 mb-8">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Full Name (Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name"
                            {...field}
                            className="transition-all duration-200 focus:ring-2 focus:ring-brand-blue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="closetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Closet Name (Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your Poshmark closet name"
                            {...field}
                            className="transition-all duration-200 focus:ring-2 focus:ring-brand-blue"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-sm text-slate-500 text-center">
                  Adding your name and closet details helps personalize the email response
                </div>
              </div>
            </Form>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Button
                onClick={() => handleGenerate("suspension")}
                disabled={limitReached || generateMutation.isPending}
                className="group relative bg-brand-error hover:bg-red-700 text-white font-semibold py-8 px-6 h-auto transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="flex items-center justify-center space-x-3">
                  <Ban className="text-xl" />
                  <div className="text-left">
                    <div className="text-lg font-bold">Account Suspension</div>
                    <div className="text-red-100 text-sm">Appeal suspended account</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleGenerate("warning")}
                disabled={limitReached || generateMutation.isPending}
                className="group relative bg-brand-warning hover:bg-amber-700 text-white font-semibold py-8 px-6 h-auto transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="flex items-center justify-center space-x-3">
                  <AlertTriangle className="text-xl" />
                  <div className="text-left">
                    <div className="text-lg font-bold">Policy Warning</div>
                    <div className="text-amber-100 text-sm">Respond to warning notice</div>
                  </div>
                </div>
              </Button>
            </div>

            {/* Loading State */}
            {generateMutation.isPending && (
              <div className="text-center py-8">
                <Loader2 className="inline-block animate-spin h-8 w-8 text-brand-blue mb-4" />
                <p className="text-slate-600">Generating your professional letter template...</p>
              </div>
            )}

            {/* Output Section */}
            {generatedTemplate && !generateMutation.isPending && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Generated Email Response</h3>
                  <Button 
                    onClick={copyToClipboard}
                    className="flex items-center space-x-2 bg-brand-success hover:bg-emerald-700 text-white"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy to Clipboard</span>
                  </Button>
                </div>
                
                <div className="relative">
                  <Textarea 
                    value={generatedTemplate}
                    readOnly
                    className="min-h-96 p-4 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    placeholder="Your generated letter will appear here..."
                  />
                  <div className="absolute top-2 right-2">
                    <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">Ready to Copy & Paste</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="text-brand-blue mt-0.5 w-5 h-5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">How to use this email response:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Copy the text above using the "Copy to Clipboard" button</li>
                        <li>Paste directly into your email reply to Poshmark</li>
                        <li>Review and make any personal adjustments if needed</li>
                        <li>Send your response and keep a copy for your records</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Limit Reached Message */}
            {limitReached && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="text-red-600 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Daily Limit Reached</h3>
                <p className="text-slate-600 mb-4">You've reached your daily limit of 20 generations. Your limit will reset at midnight.</p>
                <div className="text-sm text-slate-500">
                  <Clock className="inline w-4 h-4 mr-1" />
                  <span>Resets at midnight</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features List */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Wand2 className="text-brand-blue text-xl" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">AI-Powered</h3>
            <p className="text-slate-600 text-sm">Professional templates generated using advanced AI technology for maximum effectiveness.</p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="text-brand-success text-xl" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Compliance Ready</h3>
            <p className="text-slate-600 text-sm">Templates crafted to address Poshmark's policies and appeal processes effectively.</p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="text-purple-600 text-xl" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Instant Results</h3>
            <p className="text-slate-600 text-sm">Generate professional appeal letters in seconds, saving you time and effort.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
