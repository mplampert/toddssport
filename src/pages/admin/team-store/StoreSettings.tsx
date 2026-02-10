import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StoreNotificationSettings from "@/components/admin/team-stores/StoreNotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, TrendingUp, Globe, Truck, DollarSign } from "lucide-react";
import { toast } from "sonner";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
];

const FULFILLMENT_OPTIONS = [
  { value: "ship_to_customer", label: "Ship to Customer" },
  { value: "organization_pickup", label: "Organization Pickup" },
  { value: "deliver_to_organization", label: "Deliver to Organization" },
  { value: "local_pickup", label: "Local Pickup" },
];

export default function StoreSettings() {
  const { store } = useTeamStoreContext();
  const queryClient = useQueryClient();

  // Load global defaults for "use default" display
  const { data: globalDefaults } = useQuery({
    queryKey: ["team-store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const parseMethods = (val: string) => val ? val.split(",").filter(Boolean) : [];

  const [form, setForm] = useState({
    start_date: store.start_date ?? "",
    end_date: store.end_date ?? "",
    active: store.active,
    store_pin: store.store_pin ?? "",
    fundraising_goal_amount: store.fundraising_goal_amount != null ? String(store.fundraising_goal_amount) : "",
    country: (store as any).country ?? "",
    fulfillment_methods: parseMethods((store as any).fulfillment_method ?? ""),
    use_default_fulfillment: !((store as any).fulfillment_method),
    flat_rate_shipping: (store as any).flat_rate_shipping != null ? String((store as any).flat_rate_shipping) : "",
    org_tax_exempt: (store as any).org_tax_exempt as boolean | null,
    pickup_location: (store as any).pickup_location ?? "",
  });

  useEffect(() => {
    setForm({
      start_date: store.start_date ?? "",
      end_date: store.end_date ?? "",
      active: store.active,
      store_pin: store.store_pin ?? "",
      fundraising_goal_amount: store.fundraising_goal_amount != null ? String(store.fundraising_goal_amount) : "",
      country: (store as any).country ?? "",
      fulfillment_methods: parseMethods((store as any).fulfillment_method ?? ""),
      use_default_fulfillment: !((store as any).fulfillment_method),
      flat_rate_shipping: (store as any).flat_rate_shipping != null ? String((store as any).flat_rate_shipping) : "",
      org_tax_exempt: (store as any).org_tax_exempt as boolean | null,
      pickup_location: (store as any).pickup_location ?? "",
    });
  }, [store]);

  // Fundraising calculation
  const { data: fundsRaised = 0 } = useQuery({
    queryKey: ["funds-raised", store.id],
    queryFn: async () => {
      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select("quantity, team_store_id")
        .eq("team_store_id", store.id);
      if (error) throw error;

      const { data: products, error: pErr } = await supabase
        .from("team_store_products")
        .select("style_id, fundraising_enabled, fundraising_amount_per_unit")
        .eq("team_store_id", store.id)
        .eq("fundraising_enabled", true);
      if (pErr) throw pErr;

      const amountMap = new Map(
        (products ?? [])
          .filter((p: any) => p.fundraising_amount_per_unit)
          .map((p: any) => [p.style_id, p.fundraising_amount_per_unit])
      );

      let total = 0;
      for (const item of cartItems ?? []) {
        const amounts = Array.from(amountMap.values());
        if (amounts.length > 0) {
          total += item.quantity * (amounts[0] as number);
        }
      }
      return total;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_stores")
        .update({
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          active: form.active,
          store_pin: form.store_pin || null,
          fundraising_goal_amount: form.fundraising_goal_amount ? parseFloat(form.fundraising_goal_amount) : null,
          country: form.country || null,
          fulfillment_method: form.use_default_fulfillment ? null : (form.fulfillment_methods.join(",") || null),
          flat_rate_shipping: form.flat_rate_shipping !== "" ? parseFloat(form.flat_rate_shipping) : null,
          org_tax_exempt: form.org_tax_exempt,
          pickup_location: form.pickup_location || null,
        })
        .eq("id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team-store", store.id] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goalAmount = form.fundraising_goal_amount ? parseFloat(form.fundraising_goal_amount) : 0;
  const progressPercent = goalAmount > 0 ? Math.min(100, (fundsRaised / goalAmount) * 100) : 0;

  const effectiveCountry = form.country || globalDefaults?.default_country || "US";
  const effectiveFulfillmentMethods = form.use_default_fulfillment
    ? parseMethods(globalDefaults?.default_fulfillment_method ?? "ship_to_customer")
    : form.fulfillment_methods;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* Fundraising Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Fundraising
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fundraising Goal ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.fundraising_goal_amount}
              onChange={(e) => setForm((f) => ({ ...f, fundraising_goal_amount: e.target.value }))}
              placeholder="e.g. 5000.00"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funds Raised</span>
              <span className="font-semibold">${fundsRaised.toFixed(2)} {goalAmount > 0 && `/ $${goalAmount.toFixed(2)}`}</span>
            </div>
            {goalAmount > 0 && (
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-accent h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Store-specific overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Store Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Leave fields empty to use global defaults.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            {/* Country */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Country / Region
              </Label>
              <Select
                value={form.country || "__default__"}
                onValueChange={(v) => setForm((f) => ({ ...f, country: v === "__default__" ? "" : v }))}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    Use global default ({COUNTRIES.find((c) => c.value === (globalDefaults?.default_country ?? "US"))?.label ?? "US"})
                  </SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fulfillment Methods */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4" /> Fulfillment Methods
              </Label>
              <p className="text-xs text-muted-foreground">Select one or more options customers can choose from at checkout.</p>

              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="store-use-default-fulfillment"
                  checked={form.use_default_fulfillment}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, use_default_fulfillment: !!v }))}
                />
                <Label htmlFor="store-use-default-fulfillment" className="font-normal cursor-pointer text-muted-foreground">
                  Use global defaults
                </Label>
              </div>

              {!form.use_default_fulfillment && (
                <div className="space-y-2 ml-2">
                  {FULFILLMENT_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`store-${opt.value}`}
                        checked={form.fulfillment_methods.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          setForm((f) => ({
                            ...f,
                            fulfillment_methods: checked
                              ? [...f.fulfillment_methods, opt.value]
                              : f.fulfillment_methods.filter((m) => m !== opt.value),
                          }));
                        }}
                      />
                      <Label htmlFor={`store-${opt.value}`} className="font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {effectiveFulfillmentMethods.includes("local_pickup") && (
                <div className="space-y-2 ml-6 mt-2">
                  <Label>Pickup Location / Address</Label>
                  <Input
                    value={form.pickup_location}
                    onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
                    placeholder={globalDefaults?.default_pickup_location || "e.g. 123 Main St, Suite 4, Springfield IL 62701"}
                  />
                  {!form.pickup_location && globalDefaults?.default_pickup_location && (
                    <p className="text-xs text-muted-foreground">Using global default: {globalDefaults.default_pickup_location}</p>
                  )}
                </div>
              )}
            </div>

            {/* Flat Rate Shipping */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Flat-Rate Shipping
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.flat_rate_shipping}
                  onChange={(e) => setForm((f) => ({ ...f, flat_rate_shipping: e.target.value }))}
                  placeholder={`Global default: $${globalDefaults?.default_flat_rate_shipping ?? 0}`}
                  className="pl-7 max-w-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to use global default (${globalDefaults?.default_flat_rate_shipping ?? 0})</p>
            </div>

            {/* Tax Exempt */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.org_tax_exempt !== null ? form.org_tax_exempt : (globalDefaults?.default_org_tax_exempt ?? false)}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, org_tax_exempt: v }))}
                />
                <Label>Organization is tax-exempt</Label>
              </div>
              {form.org_tax_exempt !== null && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setForm((f) => ({ ...f, org_tax_exempt: null }))}
                >
                  Reset to global default ({globalDefaults?.default_org_tax_exempt ? "Yes" : "No"})
                </button>
              )}
            </div>

            <hr className="border-border" />

            {/* Store Availability */}
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label>Store is Active</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Store PIN (optional)</Label>
              <Input
                value={form.store_pin}
                onChange={(e) => setForm((f) => ({ ...f, store_pin: e.target.value }))}
                placeholder="Leave blank for open access"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">If set, visitors must enter this PIN to access the store.</p>
            </div>

            <Button type="submit" className="btn-cta" disabled={mutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <StoreNotificationSettings storeId={store.id} storeName={store.name} />

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Deleting a store will remove all associated products and settings. This action cannot be undone.
          </p>
          <Button variant="destructive" disabled>
            Delete Store (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
