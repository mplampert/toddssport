import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Globe, Truck, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { CategoryManager } from "@/components/admin/team-stores/CategoryManager";

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

export default function TeamStoresSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
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
    default_country: "US",
    default_fulfillment_methods: ["ship_to_customer"] as string[],
    default_flat_rate_shipping: "0",
    default_org_tax_exempt: false,
    default_pickup_location: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_country: settings.default_country ?? "US",
        default_fulfillment_methods: parseMethods(settings.default_fulfillment_method ?? "ship_to_customer"),
        default_flat_rate_shipping: String(settings.default_flat_rate_shipping ?? 0),
        default_org_tax_exempt: settings.default_org_tax_exempt ?? false,
        default_pickup_location: (settings as any).default_pickup_location ?? "",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      const { error } = await supabase
        .from("team_store_settings")
        .update({
          default_country: form.default_country,
          default_fulfillment_method: form.default_fulfillment_methods.join(",") || "ship_to_customer",
          default_flat_rate_shipping: parseFloat(form.default_flat_rate_shipping) || 0,
          default_org_tax_exempt: form.default_org_tax_exempt,
          default_pickup_location: form.default_pickup_location || null,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-settings"] });
      toast.success("Global defaults saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Team Stores Settings</h1>

      {/* Global Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Defaults
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These defaults are used when creating new team stores. Per-store overrides take precedence.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-6"
          >
            {/* Country */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Country / Region
              </Label>
              <Select
                value={form.default_country}
                onValueChange={(v) => setForm((f) => ({ ...f, default_country: v }))}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <Truck className="w-4 h-4" /> Default Fulfillment Methods
              </Label>
              <p className="text-xs text-muted-foreground">Select one or more options customers can choose from at checkout.</p>
              <div className="space-y-2">
                {FULFILLMENT_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`global-${opt.value}`}
                      checked={form.default_fulfillment_methods.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          default_fulfillment_methods: checked
                            ? [...f.default_fulfillment_methods, opt.value]
                            : f.default_fulfillment_methods.filter((m) => m !== opt.value),
                        }));
                      }}
                    />
                    <Label htmlFor={`global-${opt.value}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
              {form.default_fulfillment_methods.includes("local_pickup") && (
                <div className="space-y-2 ml-6 mt-2">
                  <Label>Default Pickup Location / Address</Label>
                  <Input
                    value={form.default_pickup_location}
                    onChange={(e) => setForm((f) => ({ ...f, default_pickup_location: e.target.value }))}
                    placeholder="e.g. 123 Main St, Suite 4, Springfield IL 62701"
                  />
                </div>
              )}
            </div>

            {/* Flat Rate Shipping */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Default Flat-Rate Shipping
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.default_flat_rate_shipping}
                  onChange={(e) => setForm((f) => ({ ...f, default_flat_rate_shipping: e.target.value }))}
                  className="pl-7 max-w-xs"
                />
              </div>
            </div>

            {/* Tax Exempt */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.default_org_tax_exempt}
                onCheckedChange={(v) => setForm((f) => ({ ...f, default_org_tax_exempt: v }))}
              />
              <Label>Organization is tax-exempt by default</Label>
            </div>

            <Button type="submit" className="btn-cta" disabled={mutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Saving…" : "Save Defaults"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Product Categories */}
      <CategoryManager />
    </div>
  );
}
