import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Tag, Upload, Eye } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  store_id: string;
  code: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  discount_type: string;
  discount_value: number;
  max_redemptions_total: number | null;
  max_redemptions_per_email: number;
  allowed_emails: string[];
  allowed_email_domains: string[];
  created_at: string;
}

interface Redemption {
  id: string;
  promo_code_id: string;
  order_id: string;
  purchaser_email: string;
  discount_snapshot: number;
  redeemed_at: string;
}

export default function StorePromoCodes() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Fetch promo codes for this store
  const { data: codes = [] } = useQuery({
    queryKey: ["store-promo-codes", store.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_promo_codes")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
  });

  // Fetch redemptions for viewing
  const { data: redemptions = [] } = useQuery({
    queryKey: ["store-promo-redemptions", viewingId],
    queryFn: async () => {
      if (!viewingId) return [];
      const { data, error } = await supabase
        .from("team_store_promo_redemptions")
        .select("*")
        .eq("promo_code_id", viewingId)
        .order("redeemed_at", { ascending: false });
      if (error) throw error;
      return data as Redemption[];
    },
    enabled: !!viewingId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag className="w-6 h-6" /> Promo Codes
        </h2>
        <Button onClick={() => setCreating(true)} className="btn-cta">
          <Plus className="w-4 h-4 mr-1" /> New Code
        </Button>
      </div>

      {codes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No promo codes yet. Create one to offer discounts.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <PromoCodeRow
                  key={c.id}
                  code={c}
                  storeId={store.id}
                  onViewRedemptions={() => setViewingId(c.id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create dialog */}
      <CreatePromoDialog
        open={creating}
        onOpenChange={setCreating}
        storeId={store.id}
      />

      {/* Redemptions dialog */}
      <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Redemptions</DialogTitle>
          </DialogHeader>
          {redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No redemptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.purchaser_email}</TableCell>
                    <TableCell className="text-sm">${Number(r.discount_snapshot).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.redeemed_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Row ── */
function PromoCodeRow({
  code,
  storeId,
  onViewRedemptions,
}: {
  code: PromoCode;
  storeId: string;
  onViewRedemptions: () => void;
}) {
  const queryClient = useQueryClient();

  const toggleActive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_promo_codes")
        .update({ active: !code.active } as any)
        .eq("id", code.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-promo-codes", storeId] });
    },
  });

  const deleteCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_store_promo_codes")
        .delete()
        .eq("id", code.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-promo-codes", storeId] });
      toast.success("Promo code deleted");
    },
  });

  const discountLabel =
    code.discount_type === "percent"
      ? `${code.discount_value}%`
      : `$${Number(code.discount_value).toFixed(2)}`;

  const emailCount = Array.isArray(code.allowed_emails) ? code.allowed_emails.length : 0;

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold">{code.code}</TableCell>
      <TableCell>{discountLabel} off</TableCell>
      <TableCell>
        <Badge variant={code.active ? "default" : "secondary"}>
          {code.active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {code.starts_at ? new Date(code.starts_at).toLocaleDateString() : "—"}
        {" → "}
        {code.ends_at ? new Date(code.ends_at).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell>
        {emailCount > 0 ? (
          <Badge variant="outline">{emailCount} emails</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">All</span>
        )}
      </TableCell>
      <TableCell className="text-right space-x-1">
        <Button variant="ghost" size="sm" onClick={onViewRedemptions}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate()}>
          {code.active ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => deleteCode.mutate()}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ── Create dialog ── */
function CreatePromoDialog({
  open,
  onOpenChange,
  storeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [maxPerEmail, setMaxPerEmail] = useState("1");
  const [emailsText, setEmailsText] = useState("");
  const [domainsText, setDomainsText] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setStartsAt("");
    setEndsAt("");
    setMaxTotal("");
    setMaxPerEmail("1");
    setEmailsText("");
    setDomainsText("");
  };

  const handleSave = async () => {
    if (!code.trim()) {
      toast.error("Code is required");
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      toast.error("Discount value must be positive");
      return;
    }

    setSaving(true);
    try {
      // Parse emails (bulk paste: one per line, comma, or semicolon)
      const emails = emailsText
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"));

      const domains = domainsText
        .split(/[\n,;]+/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const { error } = await supabase
        .from("team_store_promo_codes")
        .insert({
          store_id: storeId,
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          max_redemptions_total: maxTotal ? Number(maxTotal) : null,
          max_redemptions_per_email: Number(maxPerEmail) || 1,
          allowed_emails: emails.length > 0 ? emails : [],
          allowed_email_domains: domains.length > 0 ? domains : [],
        } as any);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["store-promo-codes", storeId] });
      toast.success("Promo code created");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create promo code");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Promo Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SAVE10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="amount">Dollar ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value *</Label>
              <Input type="number" step="0.01" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "percent" ? "10" : "5.00"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Total Redemptions</Label>
              <Input type="number" min="1" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Per Email</Label>
              <Input type="number" min="1" value={maxPerEmail} onChange={(e) => setMaxPerEmail(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Allowed Emails (bulk paste)
            </Label>
            <Textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={"Paste emails, one per line or comma-separated.\nLeave empty for unrestricted."}
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {emailsText.split(/[\n,;]+/).filter((e) => e.trim().includes("@")).length} valid emails detected
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Allowed Email Domains (optional)</Label>
            <Input
              value={domainsText}
              onChange={(e) => setDomainsText(e.target.value)}
              placeholder="e.g. company.com, school.edu"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-cta">
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Creating…" : "Create Code"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
