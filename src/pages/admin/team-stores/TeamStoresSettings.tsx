import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function TeamStoresSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Team Stores Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Global team store defaults (fundraising rates, default branding, notification preferences) will be configurable here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
