import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading state for visual feedback
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Processing your order...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Thank You for Your Order!
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Your custom uniform order has been received. Our team will review your design
              and reach out shortly with next steps.
            </p>

            {sessionId && (
              <div className="bg-secondary/50 rounded-lg p-6 mb-8 text-left">
                <h2 className="font-semibold text-foreground mb-2">Order Details</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Confirmation ID:</span>{" "}
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    {sessionId.slice(-12)}
                  </code>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Keep this ID for your records. You'll receive a confirmation email shortly.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">What Happens Next?</h3>
              <ol className="text-left text-muted-foreground space-y-3 max-w-md mx-auto">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span>Our team reviews your custom design</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span>We'll send you a digital proof for approval</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span>Production begins once you approve the proof</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <span>Your uniforms ship directly to you</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Button asChild>
                <Link to="/uniforms">Design Another Uniform</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Return Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
