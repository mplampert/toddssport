import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BulkEditMode = "price" | "fundraising" | "personalization";

interface Props {
  mode: BulkEditMode;
  selectedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (value: any) => void;
}

const titles: Record<BulkEditMode, string> = {
  price: "Set Price Override",
  fundraising: "Set Fundraising %",
  personalization: "Toggle Personalization",
};

export function BulkEditDialog({
  mode,
  selectedCount,
  open,
  onOpenChange,
  onApply,
}: Props) {
  const [value, setValue] = useState("");

  const handleApply = () => {
    if (mode === "personalization") {
      onApply(value === "on");
    } else {
      const num = value.trim() === "" ? null : Number(value);
      onApply(num);
    }
    onOpenChange(false);
    setValue("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setValue(""); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>
            Apply to {selectedCount} selected product(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {mode === "price" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Price Override ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Leave empty to clear"
                autoFocus
              />
            </div>
          )}
          {mode === "fundraising" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Fundraising Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Leave empty to clear"
                autoFocus
              />
            </div>
          )}
          {mode === "personalization" && (
            <div className="flex gap-2">
              <Button
                variant={value === "on" ? "default" : "outline"}
                onClick={() => setValue("on")}
                className="flex-1"
              >
                Enable
              </Button>
              <Button
                variant={value === "off" ? "default" : "outline"}
                onClick={() => setValue("off")}
                className="flex-1"
              >
                Disable
              </Button>
            </div>
          )}
          <Button
            onClick={handleApply}
            className="w-full"
            disabled={mode === "personalization" && !value}
          >
            Apply to {selectedCount} products
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
