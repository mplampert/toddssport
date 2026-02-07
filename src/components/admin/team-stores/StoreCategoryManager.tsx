import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Tags, Eye, EyeOff, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Props {
  storeId: string;
}

interface GlobalCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface CategoryOverride {
  id: string;
  team_store_id: string;
  category_id: string | null;
  display_name: string | null;
  is_hidden: boolean;
  is_custom: boolean;
  sort_order: number;
}

export interface EffectiveCategory {
  /** The override id if one exists, otherwise the global category id */
  id: string;
  /** The override row id (null if no override exists yet) */
  overrideId: string | null;
  /** Global category id (null for custom categories) */
  globalCategoryId: string | null;
  /** Display name (override name > global name) */
  name: string;
  /** Whether hidden for this store */
  hidden: boolean;
  /** Whether this is a store-custom category */
  isCustom: boolean;
  sortOrder: number;
}

/**
 * Compute effective categories: merge global categories with per-store overrides.
 */
export function computeEffectiveCategories(
  globalCategories: GlobalCategory[],
  overrides: CategoryOverride[]
): EffectiveCategory[] {
  const overrideByGlobalId = new Map<string, CategoryOverride>();
  const customOverrides: CategoryOverride[] = [];

  for (const ov of overrides) {
    if (ov.is_custom || !ov.category_id) {
      customOverrides.push(ov);
    } else {
      overrideByGlobalId.set(ov.category_id, ov);
    }
  }

  const result: EffectiveCategory[] = [];

  // Global categories (active ones) merged with overrides
  for (const gc of globalCategories.filter((g) => g.is_active)) {
    const ov = overrideByGlobalId.get(gc.id);
    result.push({
      id: ov?.id ?? gc.id,
      overrideId: ov?.id ?? null,
      globalCategoryId: gc.id,
      name: ov?.display_name || gc.name,
      hidden: ov?.is_hidden ?? false,
      isCustom: false,
      sortOrder: ov?.sort_order ?? gc.sort_order,
    });
  }

  // Custom store-only categories
  for (const ov of customOverrides) {
    result.push({
      id: ov.id,
      overrideId: ov.id,
      globalCategoryId: null,
      name: ov.display_name || "Untitled",
      hidden: ov.is_hidden,
      isCustom: true,
      sortOrder: ov.sort_order,
    });
  }

  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Hook to fetch effective categories for a store
 */
export function useEffectiveCategories(storeId: string) {
  const { data: globalCategories = [] } = useQuery({
    queryKey: ["team-store-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as GlobalCategory[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["store-category-overrides", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_store_category_overrides")
        .select("*")
        .eq("team_store_id", storeId)
        .order("sort_order");
      if (error) throw error;
      return data as CategoryOverride[];
    },
  });

  const effective = computeEffectiveCategories(globalCategories, overrides);
  const visible = effective.filter((c) => !c.hidden);

  return { effective, visible, globalCategories, overrides };
}

/**
 * Per-store category override manager dialog
 */
export function StoreCategoryManager({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");

  const { effective, overrides } = useEffectiveCategories(storeId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["store-category-overrides", storeId] });
  };

  // Upsert an override for a global category
  const upsertOverride = useMutation({
    mutationFn: async (params: {
      globalCategoryId: string;
      existingOverrideId?: string | null;
      display_name?: string | null;
      is_hidden?: boolean;
      sort_order?: number;
    }) => {
      if (params.existingOverrideId) {
        const updates: any = {};
        if (params.display_name !== undefined) updates.display_name = params.display_name;
        if (params.is_hidden !== undefined) updates.is_hidden = params.is_hidden;
        if (params.sort_order !== undefined) updates.sort_order = params.sort_order;
        const { error } = await supabase
          .from("team_store_category_overrides")
          .update(updates)
          .eq("id", params.existingOverrideId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("team_store_category_overrides")
          .insert({
            team_store_id: storeId,
            category_id: params.globalCategoryId,
            display_name: params.display_name ?? null,
            is_hidden: params.is_hidden ?? false,
            sort_order: params.sort_order ?? 0,
            is_custom: false,
          });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // Add custom category
  const addCustom = useMutation({
    mutationFn: async (name: string) => {
      const nextSort = effective.length > 0 ? Math.max(...effective.map((c) => c.sortOrder)) + 1 : 0;
      const { error } = await supabase.from("team_store_category_overrides").insert({
        team_store_id: storeId,
        category_id: null,
        display_name: name,
        is_hidden: false,
        is_custom: true,
        sort_order: nextSort,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setNewCustomName("");
      toast.success("Custom category added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete custom override
  const deleteOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from("team_store_category_overrides")
        .delete()
        .eq("id", overrideId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Override removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags className="w-4 h-4 mr-1.5" />
          Manage Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Store Category Overrides</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Rename, hide, or add custom categories for this store. Changes only affect this store.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {effective.map((cat) => (
            <StoreCategoryRow
              key={cat.id}
              category={cat}
              onToggleHidden={(hidden) => {
                if (cat.globalCategoryId) {
                  upsertOverride.mutate({
                    globalCategoryId: cat.globalCategoryId,
                    existingOverrideId: cat.overrideId,
                    is_hidden: hidden,
                  });
                } else if (cat.overrideId) {
                  upsertOverride.mutate({
                    globalCategoryId: "",
                    existingOverrideId: cat.overrideId,
                    is_hidden: hidden,
                  });
                }
              }}
              onRename={(newName) => {
                if (cat.globalCategoryId) {
                  upsertOverride.mutate({
                    globalCategoryId: cat.globalCategoryId,
                    existingOverrideId: cat.overrideId,
                    display_name: newName || null,
                  });
                } else if (cat.overrideId) {
                  upsertOverride.mutate({
                    globalCategoryId: "",
                    existingOverrideId: cat.overrideId,
                    display_name: newName,
                  });
                }
              }}
              onDelete={
                cat.isCustom && cat.overrideId
                  ? () => deleteOverride.mutate(cat.overrideId!)
                  : cat.overrideId && cat.globalCategoryId
                  ? () => deleteOverride.mutate(cat.overrideId!)
                  : undefined
              }
            />
          ))}
        </div>

        {/* Add custom category */}
        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-medium mb-2 block">Add Custom Category</Label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newCustomName.trim()) addCustom.mutate(newCustomName.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              placeholder="e.g. Varsity Gear"
              className="text-sm"
            />
            <Button type="submit" size="sm" disabled={addCustom.isPending || !newCustomName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StoreCategoryRow({
  category,
  onToggleHidden,
  onRename,
  onDelete,
}: {
  category: EffectiveCategory;
  onToggleHidden: (hidden: boolean) => void;
  onRename: (name: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
        category.hidden ? "opacity-50 bg-muted/30" : "bg-background hover:bg-muted/30"
      }`}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />

      {editing ? (
        <form
          className="flex-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (editName.trim()) onRename(editName.trim());
            setEditing(false);
          }}
        >
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="text-sm h-7"
            autoFocus
            onBlur={() => {
              if (editName.trim() && editName.trim() !== category.name) {
                onRename(editName.trim());
              }
              setEditing(false);
            }}
          />
        </form>
      ) : (
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium">{category.name}</span>
          {category.isCustom && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Custom
            </Badge>
          )}
          {category.overrideId && !category.isCustom && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Renamed
            </Badge>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          setEditName(category.name);
          setEditing(true);
        }}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onToggleHidden(!category.hidden)}
      >
        {category.hidden ? (
          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </Button>

      {onDelete && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}
