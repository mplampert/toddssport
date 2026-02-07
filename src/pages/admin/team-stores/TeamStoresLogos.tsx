import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "lucide-react";

export default function TeamStoresLogos() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Global Logos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A global library of logos across all team stores will be available here. Manage individual store logos from each store's detail page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
