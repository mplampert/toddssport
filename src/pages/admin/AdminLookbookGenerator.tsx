import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Download, Eye, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LookbookPreview } from "@/components/admin/lookbook/LookbookPreview";
import { generateLookbookPDF } from "@/lib/lookbookPdf";

interface PackageItem {
  name: string;
  type: string;
  priceRange: string;
  imageUrl?: string;
  isFromCatalog: boolean;
}

interface LookbookPackage {
  name: string;
  tagline: string;
  description: string;
  items: PackageItem[];
  totalRange: string;
  marketingCopy: string;
}

interface LookbookData {
  packages: LookbookPackage[];
  overallIntro: string;
  closingCTA: string;
  teamName: string;
  sport: string;
  level: string;
  colors: string;
  budget: string;
  catalogProductsUsed: number;
}

const SPORTS = [
  "Baseball", "Basketball", "Cheerleading", "Football", "Golf", 
  "Hockey", "Lacrosse", "Soccer", "Softball", "Swimming", 
  "Tennis", "Track", "Volleyball", "Wrestling"
];

const LEVELS = [
  "Youth Recreation",
  "Youth Travel/Club",
  "Middle School",
  "High School JV",
  "High School Varsity",
  "Club/AAU",
  "College",
  "Adult League"
];

const BUDGETS = [
  "Economy ($30-50/player)",
  "Standard ($50-100/player)",
  "Premium ($100-175/player)",
  "Elite ($175-300/player)",
  "Championship ($300+/player)"
];

export default function AdminLookbookGenerator() {
  const [sport, setSport] = useState("");
  const [level, setLevel] = useState("");
  const [colors, setColors] = useState("");
  const [budget, setBudget] = useState("");
  const [teamName, setTeamName] = useState("");
  const [includeProducts, setIncludeProducts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lookbookData, setLookbookData] = useState<LookbookData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!sport || !teamName) {
      toast({
        title: "Missing fields",
        description: "Please enter at least a sport and team name.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setLookbookData(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lookbook', {
        body: {
          sport,
          level,
          colors,
          budget,
          teamName,
          includeProducts
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setLookbookData(data);
      setShowPreview(true);
      
      toast({
        title: "Lookbook generated!",
        description: `Created ${data.packages?.length || 0} package options${data.catalogProductsUsed > 0 ? ` using ${data.catalogProductsUsed} catalog products` : ''}.`
      });
    } catch (error) {
      console.error('Error generating lookbook:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate lookbook",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!lookbookData) return;

    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your lookbook."
      });

      const pdfBlob = await generateLookbookPDF(lookbookData);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lookbookData.teamName.replace(/\s+/g, '-')}-Lookbook.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF downloaded!",
        description: "Your lookbook has been saved."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF generation failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Concept Lookbook Generator</h1>
          <p className="text-muted-foreground">
            Generate branded uniform and spiritswear package proposals with AI-powered copy.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Generate Lookbook
              </CardTitle>
              <CardDescription>
                Enter team details to create custom package recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Westfield Warriors"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport">Sport *</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger id="sport">
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map(s => (
                      <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Competition Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colors">Team Colors</Label>
                <Input
                  id="colors"
                  placeholder="e.g., Navy blue and gold"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger id="budget">
                    <SelectValue placeholder="Select budget tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGETS.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="includeProducts">Include Catalog Products</Label>
                  <p className="text-xs text-muted-foreground">
                    Pull from your product database when available
                  </p>
                </div>
                <Switch
                  id="includeProducts"
                  checked={includeProducts}
                  onCheckedChange={setIncludeProducts}
                />
              </div>

              <Button 
                className="w-full btn-cta" 
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Lookbook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Generated Packages
              </CardTitle>
              <CardDescription>
                {lookbookData 
                  ? `${lookbookData.packages.length} packages for ${lookbookData.teamName}`
                  : "Results will appear here after generation"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!lookbookData ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>Enter team details and click Generate to create your lookbook.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground italic">
                    "{lookbookData.overallIntro}"
                  </p>
                  
                  <div className="space-y-3">
                    {lookbookData.packages.map((pkg, index) => (
                      <div 
                        key={index}
                        className="p-3 border rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-sm text-muted-foreground">{pkg.tagline}</p>
                          </div>
                          <span className="text-sm font-medium text-accent">
                            {pkg.totalRange}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {pkg.items.length} items: {pkg.items.map(i => i.name).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      className="flex-1 btn-cta"
                      onClick={handleDownloadPDF}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && lookbookData && (
        <LookbookPreview 
          data={lookbookData} 
          onClose={() => setShowPreview(false)}
          onDownload={handleDownloadPDF}
        />
      )}
    </AdminLayout>
  );
}
