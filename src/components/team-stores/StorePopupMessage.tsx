import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

const VARIANT_STYLES: Record<string, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
  warning: { bg: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: AlertTriangle },
  danger: { bg: "bg-red-50 border-red-200 text-red-800", icon: AlertCircle },
  success: { bg: "bg-green-50 border-green-200 text-green-800", icon: CheckCircle },
};

function getDismissKey(storeId: string) {
  return `store_popup_dismissed_${storeId}`;
}

function isDismissed(storeId: string, dismissDays: number): boolean {
  try {
    const raw = localStorage.getItem(getDismissKey(storeId));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return false;
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysSince < dismissDays;
  } catch {
    return false;
  }
}

interface Props {
  storeId: string;
}

export function StorePopupMessage({ storeId }: Props) {
  const [open, setOpen] = useState(false);

  const { data: popup } = useQuery({
    queryKey: ["store-popup", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_messages")
        .select("id, title, content, style_variant, popup_dismiss_days")
        .eq("team_store_id", storeId)
        .eq("location", "home")
        .eq("is_popup", true)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  useEffect(() => {
    if (popup && !isDismissed(storeId, popup.popup_dismiss_days ?? 7)) {
      setOpen(true);
    }
  }, [popup, storeId]);

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(getDismissKey(storeId), Date.now().toString());
    } catch { /* noop */ }
  }

  if (!popup) return null;

  const variant = VARIANT_STYLES[popup.style_variant] || VARIANT_STYLES.info;
  const Icon = variant.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {popup.title || "Store Notice"}
          </DialogTitle>
          <DialogDescription className="sr-only">Important store information</DialogDescription>
        </DialogHeader>
        <div
          className={`p-4 rounded-lg border text-sm ${variant.bg} [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_a]:underline [&_a]:font-medium`}
          dangerouslySetInnerHTML={{ __html: popup.content }}
        />
        <div className="flex justify-end">
          <Button onClick={handleClose}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
