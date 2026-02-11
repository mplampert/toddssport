import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Image } from "lucide-react";
import { ArtTemplatesTab } from "@/components/admin/art-library/ArtTemplatesTab";
import { TeamLogosTab } from "@/components/admin/art-library/TeamLogosTab";

export default function AdminArtLibrary() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Art Library</h1>
          <p className="text-muted-foreground text-sm">
            Browse design templates and customize logos for teams
          </p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5">
              <Palette className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="team-logos" className="gap-1.5">
              <Image className="w-4 h-4" />
              Team Logos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <ArtTemplatesTab />
          </TabsContent>

          <TabsContent value="team-logos">
            <TeamLogosTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
