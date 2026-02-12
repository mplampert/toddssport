import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Database,
  BarChart3,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

interface SSBrand {
  brandName: string;
  count: number;
  logoUrl: string | null;
}

interface ImportLogEntry {
  brand: string;
  fetched: number;
  written: number;
  error?: string;
}

interface ImportJob {
  id: string;
  status: string;
  brands_requested: string[];
  current_brand: string | null;
  brands_completed: number;
  brands_total: number;
  products_imported: number;
  log: ImportLogEntry[];
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export function SSBulkImportPanel() {
  const [ssBrands, setSSBrands] = useState<SSBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [fixingBrands, setFixingBrands] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [remediating, setRemediating] = useState(false);
  const [remediateReport, setRemediateReport] = useState<any>(null);
  const queryClient = useQueryClient();

  // Debug stats
  const { data: debugStats } = useQuery({
    queryKey: ["ss-debug-stats"],
    queryFn: async () => {
      const [
        masterCountRes,
        ssCountRes,
        brandCountRes,
        visibleBrandCountRes,
        colorProductsRes,
      ] = await Promise.all([
        supabase.from("master_products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("master_products").select("id", { count: "exact", head: true }).eq("active", true).eq("source", "ss_activewear"),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }).eq("show_in_catalog", true),
        supabase.from("product_color_images").select("master_product_id", { count: "exact", head: true }),
      ]);
      // Count distinct products with colors
      const ssWithColorsCount = colorProductsRes.count || 0;
      return {
        masterTotal: masterCountRes.count || 0,
        ssTotal: ssCountRes.count || 0,
        brandsTotal: brandCountRes.count || 0,
        brandsVisible: visibleBrandCountRes.count || 0,
        ssWithColors: ssWithColorsCount,
      };
    },
    staleTime: 30000,
  });

  // Load available S&S brands from the live API (for selective import)
  const loadBrands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ss-activewear", {
        body: { endpoint: "styles" },
      });
      if (error) throw error;

      const styles = Array.isArray(data) ? data : [];
      const brandMap = new Map<string, { count: number; logoUrl: string | null }>();
      for (const s of styles) {
        const existing = brandMap.get(s.brandName);
        if (existing) {
          existing.count++;
        } else {
          brandMap.set(s.brandName, { count: 1, logoUrl: s.brandImage || null });
        }
      }

      const brands: SSBrand[] = [...brandMap.entries()]
        .map(([name, info]) => ({ brandName: name, count: info.count, logoUrl: info.logoUrl }))
        .sort((a, b) => b.count - a.count);

      setSSBrands(brands);
      setLoaded(true);
      setShowBrandPicker(true);
    } catch (err) {
      toast.error("Failed to load S&S brands");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll active job
  const { data: jobData } = useQuery({
    queryKey: ["ss-import-job", activeJobId],
    queryFn: async () => {
      if (!activeJobId) return null;
      const { data, error } = await supabase
        .from("ss_import_jobs")
        .select("*")
        .eq("id", activeJobId)
        .single();
      if (error) return null;
      return data as unknown as ImportJob;
    },
    enabled: !!activeJobId,
    refetchInterval: activeJobId ? 3000 : false,
  });

  const job = jobData || null;
  const isRunning = job?.status === "running" || job?.status === "pending";

  useEffect(() => {
    if (job && !isRunning && activeJobId) {
      queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
      queryClient.invalidateQueries({ queryKey: ["ss-debug-stats"] });
      if (job.status === "completed") {
        toast.success(`Import complete: ${job.products_imported} products imported`);
      }
    }
  }, [job?.status]);

  const toggleBrand = (name: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === ssBrands.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ssBrands.map((b) => b.brandName)));
    }
  };

  // Full sync - fetches everything from S&S in one shot
  const startFullSync = async () => {
    try {
      const { data: jobRow, error: insertErr } = await supabase
        .from("ss_import_jobs")
        .insert({
          brands_requested: ["__FULL_SYNC__"],
          brands_total: 0,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      const jobId = jobRow.id;
      setActiveJobId(jobId);
      setShowLog(true);

      supabase.functions.invoke("ss-full-sync", {
        body: { job_id: jobId },
      }).catch((err) => {
        console.error("Full sync invocation error:", err);
        toast.error("Full sync failed to start");
      });

      toast.info("Started full S&S catalog sync...");
    } catch (err: any) {
      toast.error(`Failed to start sync: ${err.message}`);
    }
  };

  // Brand-by-brand import (legacy)
  const startBrandImport = async (brandsToImport: string[]) => {
    try {
      const { data: jobRow, error: insertErr } = await supabase
        .from("ss_import_jobs")
        .insert({
          brands_requested: brandsToImport,
          brands_total: brandsToImport.length,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      const jobId = jobRow.id;
      setActiveJobId(jobId);
      setShowLog(true);

      supabase.functions.invoke("ss-bulk-import", {
        body: { job_id: jobId, brands: brandsToImport },
      }).catch((err) => {
        console.error("Bulk import invocation error:", err);
        toast.error("Import failed to start");
      });

      toast.info(`Started importing ${brandsToImport.length} brands...`);
    } catch (err: any) {
      toast.error(`Failed to start import: ${err.message}`);
    }
  };

  const fixOrphanedBrands = async () => {
    setFixingBrands(true);
    try {
      const { data, error } = await supabase.functions.invoke("ss-fix-brands");
      if (error) throw error;
      toast.success(data?.message || "Brands fixed");
      queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
      queryClient.invalidateQueries({ queryKey: ["ss-debug-stats"] });
    } catch (err: any) {
      toast.error(`Fix failed: ${err.message}`);
    } finally {
      setFixingBrands(false);
    }
  };

  // Remediate all — fix style_code, pricing, colors (auto-loops through all batches)
  const startRemediation = async () => {
    setRemediating(true);
    setRemediateReport(null);
    try {
      toast.info("Phase 1: Fixing style codes & SKUs for all S&S products…");
      const { data: p1, error: p1Err } = await supabase.functions.invoke("ss-remediate-all", {
        body: { phase: 1 },
      });
      if (p1Err) throw p1Err;
      
      const p1Report = p1?.report;
      toast.success(`Phase 1 done: ${p1Report?.fixed || 0} products fixed, ${p1Report?.alreadyCorrect || 0} already correct`);

      // Phase 2: auto-loop through all batches
      const batchSize = 100;
      let offset = 0;
      let totalPricing = 0;
      let totalColors = 0;
      let totalErrors = 0;
      let totalProcessed = 0;
      let batchNum = 0;

      while (true) {
        batchNum++;
        toast.info(`Phase 2: Batch ${batchNum} (products ${offset}–${offset + batchSize})…`);
        
        const { data: p2, error: p2Err } = await supabase.functions.invoke("ss-remediate-all", {
          body: { phase: 2, offset, limit: batchSize, force: true },
        });
        if (p2Err) throw p2Err;

        const r = p2?.report;
        if (!r || r.processed === 0) break;

        totalPricing += r.pricingUpdated || 0;
        totalColors += r.colorsImported || 0;
        totalErrors += r.errors || 0;
        totalProcessed += r.processed || 0;
        offset = r.nextOffset || offset + batchSize;

        // Update report live so user sees progress
        setRemediateReport({
          phase1: p1Report,
          phase2: { pricingUpdated: totalPricing, colorsImported: totalColors, errors: totalErrors, processed: totalProcessed },
        });
        queryClient.invalidateQueries({ queryKey: ["ss-debug-stats"] });

        // If we processed fewer than the batch size, we're done
        if (r.processed < batchSize) break;
      }

      toast.success(`All done! ${totalProcessed} products processed, ${totalColors} color images imported`);
      queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
      queryClient.invalidateQueries({ queryKey: ["ss-debug-stats"] });
    } catch (err: any) {
      toast.error(`Remediation failed: ${err.message}`);
    } finally {
      setRemediating(false);
    }
  };

  const progressPercent =
    job && job.brands_total > 0
      ? Math.round((job.brands_completed / job.brands_total) * 100)
      : 0;

  const apiStyleCount = loaded
    ? ssBrands.reduce((sum, b) => sum + b.count, 0)
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground">S&S Activewear Sync</h3>
          <p className="text-sm text-muted-foreground">
            Sync the full S&S catalog into master_products.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={startFullSync}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Sync All from S&S</>
            )}
          </Button>
          <Button onClick={fixOrphanedBrands} disabled={fixingBrands} variant="outline" size="sm">
            {fixingBrands ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fixing…</>
            ) : (
              <>Fix Orphaned Brands</>
            )}
          </Button>
          <Button onClick={startRemediation} disabled={remediating || isRunning} variant="outline" size="sm">
            {remediating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Remediating…</>
            ) : (
              <><Wrench className="w-4 h-4 mr-2" />Fix All Mappings</>
            )}
          </Button>
        </div>
      </div>

      {/* Remediation Report */}
      {remediateReport && (
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Remediation Report
          </p>
          {remediateReport.phase1 && (
            <div className="text-muted-foreground space-y-0.5">
              <p>Phase 1 — Style code fixes: <strong className="text-foreground">{remediateReport.phase1.fixed}</strong> fixed, {remediateReport.phase1.alreadyCorrect} already correct, {remediateReport.phase1.notFoundInApi} not in API</p>
            </div>
          )}
          {remediateReport.phase2 && (
            <div className="text-muted-foreground space-y-0.5">
              <p>Phase 2 — Pricing: <strong className="text-foreground">{remediateReport.phase2.pricingUpdated}</strong> updated | Colors: <strong className="text-foreground">{remediateReport.phase2.colorsImported}</strong> images imported | Errors: {remediateReport.phase2.errors}</p>
              <p className="text-xs">Processed {remediateReport.phase2.processed} products. Run again with higher offset for more.</p>
            </div>
          )}
        </div>
      )}

      {/* Debug Stats */}
      {debugStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">master_products (total)</span>
            </div>
            <p className="text-lg font-bold text-foreground">{debugStats.masterTotal.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">S&S in master_products</span>
            </div>
            <p className="text-lg font-bold text-foreground">{debugStats.ssTotal.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Brands (total)</span>
            </div>
            <p className="text-lg font-bold text-foreground">{debugStats.brandsTotal.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Brands (visible)</span>
            </div>
            <p className="text-lg font-bold text-foreground">{debugStats.brandsVisible.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 col-span-2 sm:col-span-4">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">S&S products with color images</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-foreground">{debugStats.ssWithColors.toLocaleString()}</p>
              <span className="text-xs text-muted-foreground">/ {debugStats.ssTotal.toLocaleString()}</span>
              {debugStats.ssTotal > 0 && (
                <span className="text-xs font-medium ml-1">
                  ({Math.round((debugStats.ssWithColors / debugStats.ssTotal) * 100)}%)
                  {debugStats.ssWithColors >= debugStats.ssTotal ? " ✅ Complete!" : ` — ${(debugStats.ssTotal - debugStats.ssWithColors).toLocaleString()} remaining`}
                </span>
              )}
            </div>
            {debugStats.ssTotal > 0 && (
              <Progress value={(debugStats.ssWithColors / debugStats.ssTotal) * 100} className="h-1.5 mt-2" />
            )}
          </div>
          {apiStyleCount !== null && (
            <div className="bg-accent/10 rounded-lg p-3 col-span-2 sm:col-span-4">
              <span className="text-xs text-muted-foreground">S&S API styles (live): </span>
              <span className="text-sm font-bold text-accent">{apiStyleCount.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({apiStyleCount - debugStats.ssTotal > 0 ? `${(apiStyleCount - debugStats.ssTotal).toLocaleString()} missing` : "all synced ✓"})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Active Job Progress */}
      {job && (
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : job.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="text-sm font-medium">
                {isRunning
                  ? `${job.current_brand || "Starting…"} (${job.brands_completed}/${job.brands_total})`
                  : job.status === "completed"
                    ? `Complete — ${job.products_imported} products imported`
                    : `Failed: ${job.error || "Unknown error"}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLog(!showLog)}
              className="text-xs"
            >
              {showLog ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Log
            </Button>
          </div>
          {isRunning && <Progress value={progressPercent} className="h-2" />}

          {showLog && job.log && (job.log as ImportLogEntry[]).length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs space-y-1 font-mono bg-background/50 rounded p-2">
              {(job.log as ImportLogEntry[]).map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  {entry.error ? (
                    <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                  )}
                  <span className="text-foreground">{entry.brand}</span>
                  <span className="text-muted-foreground">
                    — {entry.fetched} fetched, {entry.written} written
                  </span>
                  {entry.error && (
                    <span className="text-destructive">({entry.error})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selective brand import (expandable) */}
      <div className="border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!loaded) loadBrands();
            else setShowBrandPicker(!showBrandPicker);
          }}
          disabled={loading}
          className="text-xs text-muted-foreground"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading brands…</>
          ) : (
            <>{showBrandPicker ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}Selective Brand Import</>
          )}
        </Button>

        {showBrandPicker && loaded && !isRunning && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => startBrandImport(ssBrands.map((b) => b.brandName))}
                disabled={isRunning}
              >
                <Download className="w-4 h-4 mr-2" />
                Import All {ssBrands.length} Brands (legacy)
              </Button>
              {selected.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startBrandImport([...selected])}
                  disabled={isRunning}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import {selected.size} Selected
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Checkbox
                  checked={selected.size === ssBrands.length && ssBrands.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {ssBrands.map((brand) => (
                <label
                  key={brand.brandName}
                  className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs transition-colors ${
                    selected.has(brand.brandName)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(brand.brandName)}
                    onCheckedChange={() => toggleBrand(brand.brandName)}
                  />
                  <span className="truncate font-medium">{brand.brandName}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto flex-shrink-0">
                    {brand.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter documentation */}
      <div className="text-[11px] text-muted-foreground border-t border-border pt-3 space-y-1">
        <p className="font-medium text-foreground/70">Catalog filter rules (/ss-products & /catalog):</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><code className="text-[10px]">master_products.active = true</code> — only active products</li>
          <li><code className="text-[10px]">master_products.source = 'ss_activewear'</code> — S&S source filter on /ss-products</li>
          <li><code className="text-[10px]">brands.show_in_catalog = true</code> — brand visibility toggle (admin)</li>
          <li><code className="text-[10px]">brand_id IS NOT NULL</code> — must have a mapped brand</li>
        </ul>
      </div>
    </div>
  );
}
