import { useState } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Link as LinkIcon, Mail, Check } from "lucide-react";
import { toast } from "sonner";

export default function StoreMarketing() {
  const { store } = useTeamStoreContext();
  const [copied, setCopied] = useState(false);

  const storeUrl = `${window.location.origin}/team-stores/${store.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const emailSubject = encodeURIComponent(`Shop ${store.name} Team Store`);
  const emailBody = encodeURIComponent(
    `Hi!\n\nOur team store is now open. Browse and order your gear here:\n${storeUrl}\n\n${store.store_pin ? `Store PIN: ${store.store_pin}\n\n` : ""}Thanks!`
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Marketing</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Store Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={storeUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {store.store_pin && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Store PIN</Label>
              <div className="flex gap-2 items-center">
                <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">{store.store_pin}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(store.store_pin!);
                    toast.success("PIN copied!");
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <p><strong>Subject:</strong> Shop {store.name} Team Store</p>
            <hr className="border-border" />
            <p>Hi!</p>
            <p>Our team store is now open. Browse and order your gear here:</p>
            <p className="text-accent font-medium">{storeUrl}</p>
            {store.store_pin && <p>Store PIN: <code className="bg-background px-1 rounded">{store.store_pin}</code></p>}
            <p>Thanks!</p>
          </div>
          <Button variant="outline" asChild>
            <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`}>
              <Mail className="w-4 h-4 mr-2" />
              Open in Email Client
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
