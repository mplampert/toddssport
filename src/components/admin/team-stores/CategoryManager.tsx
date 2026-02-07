import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, GripVertical, Tags } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export function CategoryManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["team-store-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0) + 1;
      const { error } = await supabase.from("team_store_categories").insert({
        name,
        slug,
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-categories"] });
      setNewName("");
      toast.success("Category added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("team_store_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_store_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase
        .from("team_store_categories")
        .update({ name, slug })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-store-categories"] });
      toast.success("Category updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5" />
          Product Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage the global category library. Categories can be assigned to products in each store to organize the storefront.
        </p>

        {/* Add new */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            addMutation.mutate(newName.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name…"
            className="text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={addMutation.isPending || !newName.trim()}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </form>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No categories yet.</p>
        ) : (
          <div className="space-y-1">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onToggle={(active) => toggleMutation.mutate({ id: cat.id, is_active: active })}
                onDelete={() => deleteMutation.mutate(cat.id)}
                onRename={(name) => renameMutation.mutate({ id: cat.id, name })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryRow({
  category,
  onToggle,
  onDelete,
  onRename,
}: {
  category: Category;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />

      {editing ? (
        <form
          className="flex-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (editName.trim() && editName.trim() !== category.name) {
              onRename(editName.trim());
            }
            setEditing(false);
          }}
        >
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="text-sm h-7"
            autoFocus
            onBlur={() => setEditing(false)}
          />
        </form>
      ) : (
        <span
          className="flex-1 text-sm font-medium cursor-pointer"
          onDoubleClick={() => setEditing(true)}
        >
          {category.name}
        </span>
      )}

      <Badge variant={category.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
        {category.is_active ? "Active" : "Inactive"}
      </Badge>

      <Switch
        checked={category.is_active}
        onCheckedChange={onToggle}
        className="scale-75"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  );
}
