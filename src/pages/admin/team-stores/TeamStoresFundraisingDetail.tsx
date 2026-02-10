import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Heart, DollarSign, ShoppingCart, Plus, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";

interface PayoutRow {
  id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

export default function TeamStoresFundraisingDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const queryClient = useQueryClient();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [payoutNotes, setPayoutNotes] = useState("");

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["fundraising-store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_stores")
        .select("id, name, status, start_date, end_date, fundraising_percent, sport")
        .eq("id", storeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["fundraising-store-orders", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_store_orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .eq("store_id", storeId!)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["fundraising-payouts", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fundraising_payouts")
        .select("id, amount, paid_at, notes, created_at")
        .eq("team_store_id", storeId!)
        .order("paid_at", { ascending: false });
      return (data ?? []) as PayoutRow[];
    },
    enabled: !!storeId,
  });

  const addPayoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fundraising_payouts").insert({
        team_store_id: storeId!,
        amount: parseFloat(payoutAmount),
        paid_at: payoutDate,
        notes: payoutNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fundraising-payouts", storeId] });
      queryClient.invalidateQueries({ queryKey: ["fundraising-payouts-all"] });
      toast.success("Payout recorded");
      setPayoutOpen(false);
      setPayoutAmount("");
      setPayoutNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rate = store?.fundraising_percent ?? 0;
  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = orders.length;
  const totalRaised = totalSales * (rate / 100);
  const totalPaid = payouts.reduce((s, p) => s + Number(p.amount), 0);
  const totalRemaining = totalRaised - totalPaid;

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Store not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/team-stores/fundraising">Back to Fundraising</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/team-stores/fundraising">
            <ArrowLeft className="w-4 h-4 mr-1" /> Fundraising
          </Link>
        </Button>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <Badge variant={store.status === "open" ? "default" : "secondary"} className="capitalize">
              {store.status ?? "draft"}
            </Badge>
            {store.sport && <span className="capitalize">{store.sport}</span>}
            <span>{store.start_date ?? "—"} → {store.end_date ?? "—"}</span>
            <span>Rate: {rate}%</span>
          </div>
        </div>
        <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
          <DialogTrigger asChild>
            <Button className="btn-cta">
              <Plus className="w-4 h-4 mr-1.5" /> Record Payout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Record Fundraising Payout</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!payoutAmount || parseFloat(payoutAmount) <= 0) return;
                addPayoutMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="250.00"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Date Paid</Label>
                <Input
                  type="date"
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Check #1234, Venmo, etc."
                  rows={2}
                />
              </div>
              <Button
                type="submit"
                className="w-full btn-cta"
                disabled={addPayoutMutation.isPending || !payoutAmount}
              >
                {addPayoutMutation.isPending ? "Saving…" : "Save Payout"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Sales", value: `$${totalSales.toFixed(2)}`, icon: DollarSign },
          { label: "Total Orders", value: totalOrders.toString(), icon: ShoppingCart },
          { label: "Funds Raised", value: `$${totalRaised.toFixed(2)}`, icon: Heart },
          { label: "Paid Out", value: `$${totalPaid.toFixed(2)}`, icon: Wallet },
          { label: "Remaining", value: `$${totalRemaining.toFixed(2)}`, icon: Receipt },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <k.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payouts History */}
      {payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payout History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.paid_at}</TableCell>
                    <TableCell className="text-right text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Order Total</TableHead>
                  <TableHead className="text-right">Fundraising</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const fundAmt = Number(o.total) * (rate / 100);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm font-medium">{o.order_number}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(o.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{o.customer_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">${Number(o.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${fundAmt.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
