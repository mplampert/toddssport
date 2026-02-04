import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import toddsLogo from "@/assets/todds-logo.png";

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
}

interface LookbookPreviewProps {
  data: LookbookData;
  onClose: () => void;
  onDownload: () => void;
}

export function LookbookPreview({ data, onClose, onDownload }: LookbookPreviewProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Lookbook Preview</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={onDownload} className="btn-cta">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Cover Page */}
          <div className="p-8 text-center border rounded-lg bg-gradient-to-br from-primary/5 to-accent/10">
            <img src={toddsLogo} alt="Todd's Sporting Goods" className="h-16 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-primary mb-2">
              {data.teamName}
            </h1>
            <p className="text-lg text-muted-foreground capitalize">
              {data.sport} {data.level && `• ${data.level}`}
            </p>
            {data.colors && (
              <p className="text-sm text-muted-foreground mt-1">
                Team Colors: {data.colors}
              </p>
            )}
            <div className="mt-6 p-4 bg-background/80 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm italic text-muted-foreground">
                {data.overallIntro}
              </p>
            </div>
          </div>

          {/* Package Pages */}
          {data.packages.map((pkg, index) => (
            <div key={index} className="p-6 border rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-medium text-accent uppercase tracking-wider">
                    Package {index + 1}
                  </span>
                  <h2 className="text-2xl font-bold">{pkg.name}</h2>
                  <p className="text-muted-foreground">{pkg.tagline}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-accent">{pkg.totalRange}</span>
                  <p className="text-xs text-muted-foreground">per player</p>
                </div>
              </div>

              <p className="mb-6">{pkg.description}</p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                {pkg.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="p-3 border rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                      <span className="text-sm font-medium">{item.priceRange}</span>
                    </div>
                    {item.isFromCatalog && (
                      <span className="inline-block mt-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                        In Stock
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-accent">
                <p className="text-sm italic">{pkg.marketingCopy}</p>
              </div>
            </div>
          ))}

          {/* CTA Page */}
          <div className="p-8 text-center border rounded-lg bg-accent/10">
            <h2 className="text-xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {data.closingCTA}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="text-center">
                <p className="font-semibold">Todd's Sporting Goods</p>
                <p className="text-sm text-muted-foreground">Your Team. Our Priority.</p>
              </div>
            </div>
            <img src={toddsLogo} alt="Todd's" className="h-10 mx-auto mt-6 opacity-50" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
