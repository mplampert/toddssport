import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
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
  const queryClient = useQueryClient();

  // Load available S&S brands from the live API
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
    } catch (err) {
      toast.error("Failed to load S&S brands");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll active job via realtime
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

  // Stop polling when done
  useEffect(() => {
    if (job && !isRunning && activeJobId) {
      queryClient.invalidateQueries({ queryKey: ["master-catalog-db"] });
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

  const startImport = async (brandsToImport: string[]) => {
    try {
      // Create job record
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

      // Fire edge function (don't await — it'll run server-side)
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
    } catch (err: any) {
      toast.error(`Fix failed: ${err.message}`);
    } finally {
      setFixingBrands(false);
    }
  };

  const progressPercent = job && job.brands_total > 0
    ? Math.round((job.brands_completed / job.brands_total) * 100)
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Bulk S&S Import</h3>
          <p className="text-sm text-muted-foreground">
            Import all styles from S&S Activewear brands into the master catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fixOrphanedBrands} disabled={fixingBrands} variant="outline" size="sm">
            {fixingBrands ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fixing…</>
            ) : (
              <>Fix Orphaned Brands</>
            )}
          </Button>
          {!loaded && (
            <Button onClick={loadBrands} disabled={loading} variant="outline" size="sm">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Load S&S Brands</>
              )}
            </Button>
          )}
        </div>
      </div>

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
                  ? `Importing ${job.current_brand || "…"} (${job.brands_completed}/${job.brands_total})`
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

      {/* Brand Selection */}
      {loaded && !isRunning && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              onClick={() => startImport(ssBrands.map((b) => b.brandName))}
              disabled={isRunning}
            >
              <Download className="w-4 h-4 mr-2" />
              Import All {ssBrands.length} Brands
            </Button>
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startImport([...selected])}
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
        </>
      )}
    </div>
  );
}
