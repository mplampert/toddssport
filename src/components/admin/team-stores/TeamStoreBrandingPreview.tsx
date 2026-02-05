import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";

interface Props {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  start_date: string | null;
  end_date: string | null;
}

export function TeamStoreBrandingPreview({ name, logo_url, primary_color, secondary_color, start_date, end_date }: Props) {
  const pColor = primary_color ?? "#000000";
  const sColor = secondary_color ?? "#ffffff";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg p-6 flex flex-col items-center gap-4 text-center"
          style={{ background: `linear-gradient(135deg, ${pColor}, ${sColor})` }}
        >
          {logo_url ? (
            <img src={logo_url} alt={name} className="w-20 h-20 object-contain rounded-lg bg-white/90 p-2" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-white/90 flex items-center justify-center">
              <Store className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <h3 className="text-lg font-bold" style={{ color: sColor === "#ffffff" || sColor === "#fff" ? "#fff" : sColor }}>
            {name}
          </h3>
          {(start_date || end_date) && (
            <p className="text-xs opacity-80" style={{ color: "#fff" }}>
              {start_date ?? "—"} → {end_date ?? "—"}
            </p>
          )}
        </div>
        <div className="mt-3 flex gap-2 items-center text-xs text-muted-foreground">
          <span>Primary:</span>
          <div className="w-5 h-5 rounded border" style={{ backgroundColor: pColor }} />
          <span className="font-mono">{pColor}</span>
          <span className="ml-3">Secondary:</span>
          <div className="w-5 h-5 rounded border" style={{ backgroundColor: sColor }} />
          <span className="font-mono">{sColor}</span>
        </div>
      </CardContent>
    </Card>
  );
}
