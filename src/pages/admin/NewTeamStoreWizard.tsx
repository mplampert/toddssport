import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Plus,
  Trash2,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Store Basics",
  "Branding",
  "Products",
  "Pricing",
  "Review & Launch",
] as const;

interface SelectedProduct {
  styleId: number;
  styleName: string;
  brandName: string;
  styleImage: string | null;
  priceOverride: string;
  notes: string;
}

export default function NewTeamStoreWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Step 1: Basics
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState("spirit_wear");
  const [description, setDescription] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");

  // Step 2: Branding
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 3: Products
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Step 4: Pricing
  const [fundraisingPercent, setFundraisingPercent] = useState("20");

  // Product search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["wizard-product-search", productSearch],
    queryFn: async () => {
      if (!productSearch || productSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("catalog_styles")
        .select("id, style_id, style_name, brand_name, style_image")
        .or(
          `style_name.ilike.%${productSearch}%,brand_name.ilike.%${productSearch}%,style_id.eq.${
            isNaN(Number(productSearch)) ? 0 : Number(productSearch)
          }`
        )
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: productSearch.length >= 2,
  });

  const selectedStyleIds = new Set(selectedProducts.map((p) => p.styleId));

  const addProduct = (style: any) => {
    if (selectedStyleIds.has(style.id)) return;
    setSelectedProducts((prev) => [
      ...prev,
      {
        styleId: style.id,
        styleName: style.style_name,
        brandName: style.brand_name,
        styleImage: style.style_image,
        priceOverride: "",
        notes: "",
      },
    ]);
  };

  const removeProduct = (styleId: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.styleId !== styleId));
  };

  const updateProduct = (
    styleId: number,
    field: "priceOverride" | "notes",
    value: string
  ) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.styleId === styleId ? { ...p, [field]: value } : p))
    );
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleCreateStore = async () => {
    if (!storeName.trim()) {
      toast.error("Store name is required");
      return;
    }
    setCreating(true);
    try {
      const slug = generateSlug(storeName);
      const { data: storeData, error: storeError } = await supabase
        .from("team_stores")
        .insert({
          name: storeName.trim(),
          slug,
          store_type: storeType,
          description: description.trim() || null,
          start_date: openDate || null,
          end_date: closeDate || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          hero_title: heroTitle.trim() || null,
          hero_subtitle: heroSubtitle.trim() || null,
          logo_url: logoUrl.trim() || null,
          fundraising_percent: parseFloat(fundraisingPercent) || 20,
          fundraising_goal: 0,
          active: false,
        } as any)
        .select("id")
        .single();

      if (storeError) throw storeError;

      // Insert products
      if (selectedProducts.length > 0) {
        const { error: productsError } = await supabase
          .from("team_store_products")
          .insert(
            selectedProducts.map((p, i) => ({
              team_store_id: storeData.id,
              style_id: p.styleId,
              price_override: p.priceOverride
                ? parseFloat(p.priceOverride)
                : null,
              notes: p.notes.trim() || null,
              sort_order: i + 1,
            }))
          );
        if (productsError) throw productsError;
      }

      toast.success("Team store created!");
      navigate(`/admin/team-stores/${storeData.id}/dashboard`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create store");
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return storeName.trim().length > 0;
    return true;
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => navigate("/admin/team-stores")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Team Stores
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            New Team Store Wizard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your store in {STEPS.length} easy steps
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={
                  i === step
                    ? "text-foreground font-semibold"
                    : i < step
                    ? "text-primary"
                    : ""
                }
              >
                {s}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Step {step + 1}: {STEPS[step]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && <StepBasics {...{ storeName, setStoreName, storeType, setStoreType, description, setDescription, openDate, setOpenDate, closeDate, setCloseDate }} />}
            {step === 1 && <StepBranding {...{ primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor, heroTitle, setHeroTitle, heroSubtitle, setHeroSubtitle, logoUrl, setLogoUrl }} />}
            {step === 2 && (
              <StepProducts
                search={productSearch}
                setSearch={setProductSearch}
                searchResults={searchResults}
                searching={searching}
                selectedProducts={selectedProducts}
                selectedStyleIds={selectedStyleIds}
                addProduct={addProduct}
                removeProduct={removeProduct}
                updateProduct={updateProduct}
              />
            )}
            {step === 3 && <StepPricing fundraisingPercent={fundraisingPercent} setFundraisingPercent={setFundraisingPercent} selectedProducts={selectedProducts} updateProduct={updateProduct} />}
            {step === 4 && (
              <StepReview
                storeName={storeName}
                storeType={storeType}
                description={description}
                openDate={openDate}
                closeDate={closeDate}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                heroTitle={heroTitle}
                heroSubtitle={heroSubtitle}
                logoUrl={logoUrl}
                fundraisingPercent={fundraisingPercent}
                selectedProducts={selectedProducts}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateStore}
              disabled={creating || !canProceed()}
              className="btn-cta"
            >
              {creating ? (
                "Creating…"
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-1.5" /> Create & Launch
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── Step Components ── */

function StepBasics({
  storeName, setStoreName, storeType, setStoreType, description, setDescription, openDate, setOpenDate, closeDate, setCloseDate,
}: {
  storeName: string; setStoreName: (v: string) => void;
  storeType: string; setStoreType: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  openDate: string; setOpenDate: (v: string) => void;
  closeDate: string; setCloseDate: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Store Name *</Label>
        <Input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Lincoln High Baseball"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Store Type</Label>
        <Select value={storeType} onValueChange={setStoreType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spirit_wear">Spirit Wear</SelectItem>
            <SelectItem value="team_uniforms">Team Uniforms</SelectItem>
            <SelectItem value="fundraiser">Fundraiser</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the store…"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Open Date</Label>
          <Input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Close Date</Label>
          <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
        </div>
      </div>
    </>
  );
}

function StepBranding({
  primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor, heroTitle, setHeroTitle, heroSubtitle, setHeroSubtitle, logoUrl, setLogoUrl,
}: {
  primaryColor: string; setPrimaryColor: (v: string) => void;
  secondaryColor: string; setSecondaryColor: (v: string) => void;
  heroTitle: string; setHeroTitle: (v: string) => void;
  heroSubtitle: string; setHeroSubtitle: (v: string) => void;
  logoUrl: string; setLogoUrl: (v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded border border-input cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Secondary Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-10 h-10 rounded border border-input cursor-pointer"
            />
            <Input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Logo URL</Label>
        <Input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://… or leave blank"
        />
        {logoUrl && (
          <img src={logoUrl} alt="Logo preview" className="h-16 w-auto object-contain mt-2 rounded bg-muted p-2" />
        )}
      </div>
      <div className="space-y-2">
        <Label>Hero Title</Label>
        <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Welcome to the team store!" />
      </div>
      <div className="space-y-2">
        <Label>Hero Subtitle</Label>
        <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Get your gear before the deadline" />
      </div>
    </>
  );
}

function StepProducts({
  search, setSearch, searchResults, searching, selectedProducts, selectedStyleIds, addProduct, removeProduct, updateProduct,
}: {
  search: string; setSearch: (v: string) => void;
  searchResults: any[]; searching: boolean;
  selectedProducts: SelectedProduct[]; selectedStyleIds: Set<number>;
  addProduct: (s: any) => void; removeProduct: (id: number) => void;
  updateProduct: (id: number, field: "priceOverride" | "notes", value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Search Catalog</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or style ID…"
            className="pl-9"
          />
        </div>
      </div>
      {search.length >= 2 && (
        <div className="border rounded-md max-h-48 overflow-y-auto">
          {searching ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No results</p>
          ) : (
            searchResults.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {s.style_image && <img src={s.style_image} alt="" className="w-8 h-8 object-contain rounded" />}
                  <div>
                    <p className="text-sm font-medium">{s.style_name}</p>
                    <p className="text-xs text-muted-foreground">{s.brand_name} · #{s.style_id}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={selectedStyleIds.has(s.id)} onClick={() => addProduct(s)}>
                  {selectedStyleIds.has(s.id) ? "Added" : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
      {selectedProducts.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="text-sm font-semibold">Selected Products ({selectedProducts.length})</Label>
          {selectedProducts.map((p) => (
            <div key={p.styleId} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-3">
                {p.styleImage && <img src={p.styleImage} alt="" className="w-8 h-8 object-contain rounded" />}
                <div>
                  <p className="text-sm font-medium">{p.styleName}</p>
                  <p className="text-xs text-muted-foreground">{p.brandName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeProduct(p.styleId)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {selectedProducts.length === 0 && (
        <p className="text-sm text-muted-foreground">No products selected yet. Search above to add products.</p>
      )}
    </>
  );
}

function StepPricing({
  fundraisingPercent, setFundraisingPercent, selectedProducts, updateProduct,
}: {
  fundraisingPercent: string; setFundraisingPercent: (v: string) => void;
  selectedProducts: SelectedProduct[];
  updateProduct: (id: number, field: "priceOverride" | "notes", value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Fundraising Percent (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          value={fundraisingPercent}
          onChange={(e) => setFundraisingPercent(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Default: 20%. This percentage is applied to all sales for fundraising.</p>
      </div>
      {selectedProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <Label className="text-sm font-semibold">Product Pricing Overrides</Label>
          {selectedProducts.map((p) => (
            <div key={p.styleId} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                {p.styleImage && <img src={p.styleImage} alt="" className="w-8 h-8 object-contain rounded" />}
                <p className="text-sm font-medium">{p.styleName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Price Override ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p.priceOverride}
                    onChange={(e) => updateProduct(p.styleId, "priceOverride", e.target.value)}
                    placeholder="Default catalog price"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Notes</Label>
                  <Input
                    value={p.notes}
                    onChange={(e) => updateProduct(p.styleId, "notes", e.target.value)}
                    placeholder='e.g. "Home jersey"'
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StepReview({
  storeName, storeType, description, openDate, closeDate, primaryColor, secondaryColor, heroTitle, heroSubtitle, logoUrl, fundraisingPercent, selectedProducts,
}: {
  storeName: string; storeType: string; description: string;
  openDate: string; closeDate: string; primaryColor: string; secondaryColor: string;
  heroTitle: string; heroSubtitle: string; logoUrl: string;
  fundraisingPercent: string; selectedProducts: SelectedProduct[];
}) {
  const rows: [string, string][] = [
    ["Store Name", storeName],
    ["Type", storeType.replace(/_/g, " ")],
    ["Description", description || "—"],
    ["Open Date", openDate || "Not set"],
    ["Close Date", closeDate || "Not set"],
    ["Hero Title", heroTitle || "—"],
    ["Hero Subtitle", heroSubtitle || "—"],
    ["Fundraising %", `${fundraisingPercent}%`],
    ["Products", `${selectedProducts.length} selected`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain rounded bg-muted p-1" />}
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: primaryColor }} title="Primary" />
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: secondaryColor }} title="Secondary" />
        </div>
      </div>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
      {selectedProducts.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Products:</p>
          {selectedProducts.map((p) => (
            <div key={p.styleId} className="flex items-center gap-2 text-sm">
              <Check className="w-3 h-3 text-primary" />
              <span>{p.styleName}</span>
              {p.priceOverride && <Badge variant="secondary" className="text-xs">${p.priceOverride}</Badge>}
              {p.notes && <Badge variant="outline" className="text-xs">{p.notes}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
