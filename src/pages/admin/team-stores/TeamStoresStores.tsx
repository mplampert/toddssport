import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AllStoresTable } from "@/components/admin/team-stores/AllStoresTable";

type StatusTab = "all" | "scheduled" | "open" | "closed";

const tabs: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "closed", label: "Closed" },
];

export default function TeamStoresStores() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("team_stores")
        .insert({ name, slug })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["team-store-all-stores-table"] });
      toast.success("Store created");
      setCreateOpen(false);
      setNewName("");
      navigate(`/admin/team-stores/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">All Stores</h1>
        <div className="flex items-center gap-2">
          <Button className="btn-cta" onClick={() => navigate("/admin/team-stores/new")}>
            <Plus className="w-4 h-4 mr-2" /> New Team Store
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Quick Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Create Team Store</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  createMutation.mutate(newName.trim());
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Lincoln High Baseball" autoFocus />
                </div>
                <Button type="submit" className="w-full btn-cta" disabled={createMutation.isPending || !newName.trim()}>
                  {createMutation.isPending ? "Creating…" : "Create & Open"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <nav className="flex border-b border-border gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusTab === tab.value
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <AllStoresTable statusFilter={statusTab} />
    </div>
  );
}
