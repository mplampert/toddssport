import { useState, useCallback, useRef } from "react";
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
import { getStyles, type SSStyle } from "@/lib/ss-activewear";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Plus,
  Trash2,
  Rocket,
  Upload,
  Image as ImageIcon,
  Store,
} from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/store-logos/${path}`;
}

const STEPS = [
  "Store Basics",
  "Branding",
  "Products",
  "Logos",
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

interface WizardLogo {
  id: string; // local temp id
  name: string;
  method: string;
  file: File;
  previewUrl: string;
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Step 3: Products
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((val: string) => {
    setProductSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  }, []);

  // Step 4: Logos
  const [wizardLogos, setWizardLogos] = useState<WizardLogo[]>([]);

  // Step 5: Pricing
  const [fundraisingPercent, setFundraisingPercent] = useState("20");

  // Search S&S Activewear styles
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["wizard-ss-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const allStyles = await getStyles();
      const q = debouncedSearch.toLowerCase();
      return allStyles
        .filter(
          (s) =>
            s.styleName?.toLowerCase().includes(q) ||
            s.brandName?.toLowerCase().includes(q) ||
            s.title?.toLowerCase().includes(q) ||
            String(s.styleID) === debouncedSearch
        )
        .slice(0, 30);
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 60_000,
  });

  const selectedStyleIds = new Set(selectedProducts.map((p) => p.styleId));

  const addProduct = (style: SSStyle) => {
    if (selectedStyleIds.has(style.styleID)) return;
    setSelectedProducts((prev) => [
      ...prev,
      {
        styleId: style.styleID,
        styleName: style.title || style.styleName,
        brandName: style.brandName,
        styleImage: style.styleImage || null,
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

      // Upload primary logo if selected
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const tmpId = crypto.randomUUID();
        const path = `${tmpId}/primary.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("store-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        logoUrl = getPublicUrl(path);
      }

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
          logo_url: logoUrl,
          fundraising_percent: parseFloat(fundraisingPercent) || 20,
          fundraising_goal: 0,
          active: false,
        } as any)
        .select("id")
        .single();

      if (storeError) throw storeError;

      // If we used a temp ID for the logo path, re-upload with real store ID
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const realPath = `${storeData.id}/primary.${ext}`;
        await supabase.storage
          .from("store-logos")
          .upload(realPath, logoFile, { upsert: true });
        const realUrl = getPublicUrl(realPath);
        await supabase
          .from("team_stores")
          .update({ logo_url: realUrl })
          .eq("id", storeData.id);
      }

      // Upload decoration logos
      for (const logo of wizardLogos) {
        const ext = logo.file.name.split(".").pop();
        const path = `${storeData.id}/deco-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("store-logos")
          .upload(path, logo.file, { upsert: true });
        if (upErr) throw upErr;

        const { error: insertErr } = await supabase.from("store_logos").insert({
          team_store_id: storeData.id,
          name: logo.name,
          method: logo.method,
          file_url: getPublicUrl(path),
        });
        if (insertErr) throw insertErr;
      }

      // Upsert selected S&S styles into catalog_styles, then create team_store_products
      if (selectedProducts.length > 0) {
        const styleRows = selectedProducts.map((p) => ({
          style_id: p.styleId,
          style_name: p.styleName,
          brand_name: p.brandName,
          style_image: p.styleImage,
          is_active: true,
        }));

        const { data: upserted, error: upsertError } = await supabase
          .from("catalog_styles")
          .upsert(styleRows, { onConflict: "style_id" })
          .select("id, style_id");

        if (upsertError) throw upsertError;

        const styleIdMap = new Map<number, number>();
        (upserted || []).forEach((row: any) => styleIdMap.set(row.style_id, row.id));

        const { error: productsError } = await supabase
          .from("team_store_products")
          .insert(
            selectedProducts.map((p, i) => ({
              team_store_id: storeData.id,
              style_id: styleIdMap.get(p.styleId) ?? p.styleId,
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
            {step === 1 && <StepBranding {...{ primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor, heroTitle, setHeroTitle, heroSubtitle, setHeroSubtitle, logoFile, setLogoFile, logoPreview, setLogoPreview }} />}
            {step === 2 && (
              <StepProducts
                search={productSearch}
                setSearch={handleSearchChange}
                searchResults={searchResults}
                searching={searching}
                selectedProducts={selectedProducts}
                selectedStyleIds={selectedStyleIds}
                addProduct={addProduct}
                removeProduct={removeProduct}
                updateProduct={updateProduct}
              />
            )}
            {step === 3 && <StepLogos wizardLogos={wizardLogos} setWizardLogos={setWizardLogos} />}
            {step === 4 && <StepPricing fundraisingPercent={fundraisingPercent} setFundraisingPercent={setFundraisingPercent} selectedProducts={selectedProducts} updateProduct={updateProduct} />}
            {step === 5 && (
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
                logoPreview={logoPreview}
                fundraisingPercent={fundraisingPercent}
                selectedProducts={selectedProducts}
                wizardLogos={wizardLogos}
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
  primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor, heroTitle, setHeroTitle, heroSubtitle, setHeroSubtitle, logoFile, setLogoFile, logoPreview, setLogoPreview,
}: {
  primaryColor: string; setPrimaryColor: (v: string) => void;
  secondaryColor: string; setSecondaryColor: (v: string) => void;
  heroTitle: string; setHeroTitle: (v: string) => void;
  heroSubtitle: string; setHeroSubtitle: (v: string) => void;
  logoFile: File | null; setLogoFile: (f: File | null) => void;
  logoPreview: string; setLogoPreview: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

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
        <Label>Store Logo</Label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-1" />
            ) : (
              <Store className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" />
              {logoPreview ? "Replace Logo" : "Upload Logo"}
            </Button>
            {logoFile && <p className="text-xs text-muted-foreground">{logoFile.name}</p>}
          </div>
        </div>
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
        <Label>Search S&S Activewear</Label>
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
              <div key={s.styleID} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {s.styleImage && <img src={s.styleImage} alt="" className="w-8 h-8 object-contain rounded" />}
                  <div>
                    <p className="text-sm font-medium">{s.title || s.styleName}</p>
                    <p className="text-xs text-muted-foreground">{s.brandName} · #{s.styleID}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={selectedStyleIds.has(s.styleID)} onClick={() => addProduct(s)}>
                  {selectedStyleIds.has(s.styleID) ? "Added" : <><Plus className="w-3 h-3 mr-1" /> Add</>}
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

function StepLogos({
  wizardLogos,
  setWizardLogos,
}: {
  wizardLogos: WizardLogo[];
  setWizardLogos: React.Dispatch<React.SetStateAction<WizardLogo[]>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoName, setLogoName] = useState("");
  const [logoMethod, setLogoMethod] = useState("screen_print");

  const handleAddLogo = (file: File) => {
    if (!logoName.trim()) {
      toast.error("Enter a logo name first");
      return;
    }
    const newLogo: WizardLogo = {
      id: crypto.randomUUID(),
      name: logoName.trim(),
      method: logoMethod,
      file,
      previewUrl: URL.createObjectURL(file),
    };
    setWizardLogos((prev) => [...prev, newLogo]);
    setLogoName("");
  };

  const removeLogo = (id: string) => {
    setWizardLogos((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Upload decoration logos (screen print, embroidery, DTF) that will be used on the products in this store. You can assign them to specific products after the store is created.
      </p>

      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-sm font-medium">Add a Logo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Logo Name</Label>
            <Input
              value={logoName}
              onChange={(e) => setLogoName(e.target.value)}
              placeholder='e.g. "Front chest logo"'
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Decoration Method</Label>
            <Select value={logoMethod} onValueChange={setLogoMethod}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screen_print">Screen Print</SelectItem>
                <SelectItem value="embroidery">Embroidery</SelectItem>
                <SelectItem value="dtf">DTF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAddLogo(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={!logoName.trim()}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Upload & Add Logo
        </Button>
      </div>

      {wizardLogos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No logos added yet. You can also add logos later from the store's Logos tab.</p>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Added Logos ({wizardLogos.length})</Label>
          {wizardLogos.map((logo) => (
            <div key={logo.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border shrink-0">
                  <img src={logo.previewUrl} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{logo.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{logo.method.replace("_", " ")}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeLogo(logo.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
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
  storeName, storeType, description, openDate, closeDate, primaryColor, secondaryColor, heroTitle, heroSubtitle, logoPreview, fundraisingPercent, selectedProducts, wizardLogos,
}: {
  storeName: string; storeType: string; description: string;
  openDate: string; closeDate: string; primaryColor: string; secondaryColor: string;
  heroTitle: string; heroSubtitle: string; logoPreview: string;
  fundraisingPercent: string; selectedProducts: SelectedProduct[];
  wizardLogos: WizardLogo[];
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
    ["Decoration Logos", `${wizardLogos.length} uploaded`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {logoPreview && <img src={logoPreview} alt="Logo" className="h-12 w-auto object-contain rounded bg-muted p-1" />}
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
      {wizardLogos.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Decoration Logos:</p>
          {wizardLogos.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <ImageIcon className="w-3 h-3 text-primary" />
              <span>{l.name}</span>
              <Badge variant="outline" className="text-xs capitalize">{l.method.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
