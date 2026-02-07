import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function TeamStoresFundraising() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Fundraising</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Global Fundraising Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cross-store fundraising totals and reports will appear here. Configure fundraising on individual stores via their settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
