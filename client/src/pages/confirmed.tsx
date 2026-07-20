import { useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle2, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markEmailConfirmed } from "@/lib/subscription-storage";

export default function Confirmed() {
  useEffect(() => {
    markEmailConfirmed();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center">
              <Wand2 className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sidekick Tools</h1>
              <p className="text-sm text-slate-600">Poshmark Letter Generator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 flex justify-center">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-brand-success" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">You&apos;re confirmed!</h2>
            <p className="text-slate-600 mb-8">
              Thanks for subscribing. You&apos;re all set to receive tips and updates from Sidekick Tools.
            </p>
            <Link href="/">
              <Button className="w-full bg-brand-blue hover:bg-blue-700">
                Back to Letter Generator
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
