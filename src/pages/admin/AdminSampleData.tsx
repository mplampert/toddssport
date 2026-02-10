import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSampleData() {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const callSeeder = async (action: "generate" | "clear") => {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sample-orders?action=${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      },
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Unknown error");
    return data;
  };

  const generate = async () => {
    setGenerating(true);
    setLastResult(null);
    try {
      const data = await callSeeder("generate");
      setLastResult(data);
      toast.success(`Sample data generated: ${data.stats.stores} stores, ${data.stats.orders} orders`);
    } catch (err: any) {
      toast.error(err.message);
      setLastResult({ ok: false, error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const clear = async () => {
    setClearing(true);
    setLastResult(null);
    try {
      const data = await callSeeder("clear");
      setLastResult(data);
      toast.success("Sample data cleared");
    } catch (err: any) {
      toast.error(err.message);
      setLastResult({ ok: false, error: err.message });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sample Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate or clear demo data across team stores, orders, fulfillment batches, and fundraising payouts.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5" /> Generate Sample Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Creates 10 team stores (mix of Draft, Live, Closed), 40+ products,
              100+ orders with line items and personalizations, fulfillment batches, and fundraising payouts.
              All records are flagged <code className="bg-muted px-1 rounded text-xs">is_sample = true</code>.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Stores across 10 organizations and 4 seasons</li>
              <li>Products with screen print, embroidery, and DTF decorations</li>
              <li>Orders with personalizations (names &amp; numbers)</li>
              <li>Fulfillment batches in Ready, In Production, and Complete</li>
              <li>Fundraising payouts (full, partial, and unpaid)</li>
            </ul>
            <Button onClick={generate} disabled={generating || clearing} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                </>
              ) : (
                "Generate Sample Data"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5" /> Clear Sample Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Removes all records where <code className="bg-muted px-1 rounded text-xs">is_sample = true</code>.
              Real data is never touched.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={generating || clearing} className="w-full">
                  {clearing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Clearing…
                    </>
                  ) : (
                    "Clear Sample Data"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all sample data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all sample stores, products, orders, batches, and payouts. Real data is not affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={clear}
                  >
                    Clear All Sample Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card className={lastResult.ok ? "border-accent/30" : "border-destructive/30"}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              {lastResult.ok ? (
                <CheckCircle className="w-5 h-5 text-accent mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div>
                <p className="font-medium text-sm text-foreground">
                  {lastResult.ok ? lastResult.message : "Error"}
                </p>
                {lastResult.stats && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <span>Stores: {lastResult.stats.stores}</span>
                    <span>Products: {lastResult.stats.products}</span>
                    <span>Orders: {lastResult.stats.orders}</span>
                    <span>Line Items: {lastResult.stats.lineItems}</span>
                    <span>Batches: {lastResult.stats.batches}</span>
                    <span>Payouts: {lastResult.stats.payouts}</span>
                  </div>
                )}
                {lastResult.error && <p className="text-xs text-destructive mt-1">{lastResult.error}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
