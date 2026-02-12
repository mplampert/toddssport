import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

/* ─── Placement presets (percentage-based on a front garment view) ─── */
interface PlacementPreset { value: string; label: string; x: number; y: number; scale: number }
const PLACEMENTS: PlacementPreset[] = [
  { value: "left_chest", label: "Left Chest", x: 0.38, y: 0.28, scale: 0.15 },
  { value: "front_chest", label: "Front Chest", x: 0.5, y: 0.3, scale: 0.28 },
  { value: "full_front", label: "Full Front", x: 0.5, y: 0.42, scale: 0.52 },
  { value: "left_sleeve", label: "Left Sleeve", x: 0.2, y: 0.35, scale: 0.12 },
  { value: "right_sleeve", label: "Right Sleeve", x: 0.8, y: 0.35, scale: 0.12 },
  { value: "back_center", label: "Back Center", x: 0.5, y: 0.35, scale: 0.4 },
];

interface FastMockupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productImage: string | null;
  productName: string;
}

export function FastMockupDrawer({ open, onOpenChange, productImage, productName }: FastMockupDrawerProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [placement, setPlacement] = useState(PLACEMENTS[0].value);
  const [logoPosition, setLogoPosition] = useState({ x: PLACEMENTS[0].x, y: PLACEMENTS[0].y });
  const [logoScale, setLogoScale] = useState(PLACEMENTS[0].scale);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const currentPreset = PLACEMENTS.find((p) => p.value === placement) || PLACEMENTS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    // Reset position to current placement preset
    setLogoPosition({ x: currentPreset.x, y: currentPreset.y });
    setLogoScale(currentPreset.scale);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePlacementChange = (val: string) => {
    setPlacement(val);
    const preset = PLACEMENTS.find((p) => p.value === val);
    if (preset) {
      setLogoPosition({ x: preset.x, y: preset.y });
      setLogoScale(preset.scale);
    }
  };

  const clearLogo = () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    setLogoUrl(null);
  };

  /* ─── Drag-to-reposition ─── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = canvasContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left) / rect.width;
    const pointerY = (e.clientY - rect.top) / rect.height;
    dragRef.current = { offsetX: pointerX - logoPosition.x, offsetY: pointerY - logoPosition.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [logoPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width - dragRef.current.offsetX));
    const y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height - dragRef.current.offsetY));
    setLogoPosition({ x, y });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  /* ─── Export as PNG ─── */
  const handleExport = async () => {
    const container = canvasContainerRef.current;
    if (!container || !productImage) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const size = 1200;
      canvas.width = size;
      canvas.height = size;

      // Draw garment
      const garmentImg = await loadImage(productImage);
      ctx.drawImage(garmentImg, 0, 0, size, size);

      // Draw logo
      if (logoUrl) {
        const logoImg = await loadImage(logoUrl);
        const logoW = size * logoScale;
        const logoH = (logoImg.height / logoImg.width) * logoW;
        const lx = logoPosition.x * size - logoW / 2;
        const ly = logoPosition.y * size - logoH / 2;
        ctx.drawImage(logoImg, lx, ly, logoW, logoH);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mockup-${productName.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Mockup downloaded!");
      }, "image/png");
    } catch {
      toast.error("Failed to export mockup");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Fast Mockup</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Canvas Preview */}
          <div
            ref={canvasContainerRef}
            className="relative w-full bg-muted/30 border border-border rounded-xl overflow-hidden select-none"
            style={{ aspectRatio: "1/1" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-contain pointer-events-none"
                style={{ padding: "6%" }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-20 h-20 text-muted-foreground/15" />
              </div>
            )}

            {/* Logo overlay */}
            {logoUrl && (
              <div
                onPointerDown={handlePointerDown}
                className="absolute cursor-grab active:cursor-grabbing ring-2 ring-accent/50 rounded"
                style={{
                  left: `${logoPosition.x * 100}%`,
                  top: `${logoPosition.y * 100}%`,
                  width: `${logoScale * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-auto object-contain pointer-events-none"
                  draggable={false}
                />
              </div>
            )}

            {/* Placement hint when no logo */}
            {!logoUrl && (
              <div
                className="absolute border-2 border-dashed border-accent/25 rounded-lg pointer-events-none"
                style={{
                  left: `${currentPreset.x * 100}%`,
                  top: `${currentPreset.y * 100}%`,
                  width: `${currentPreset.scale * 100}%`,
                  aspectRatio: "1/1",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] text-accent/50 whitespace-nowrap">
                  {currentPreset.label}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Upload Logo */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Logo</Label>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden">
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={clearLogo}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Remove
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Replace
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Logo Image
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Placement Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Placement</Label>
              <Select value={placement} onValueChange={handlePlacementChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scale slider */}
            {logoUrl && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Logo Size ({Math.round(logoScale * 100)}%)
                </Label>
                <input
                  type="range"
                  min={5}
                  max={70}
                  value={Math.round(logoScale * 100)}
                  onChange={(e) => setLogoScale(Number(e.target.value) / 100)}
                  className="w-full accent-accent"
                />
              </div>
            )}

            {/* Export */}
            <Button
              onClick={handleExport}
              disabled={!productImage}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              Download Mockup as PNG
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This is a quick visual preview only — nothing is saved to the product.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
