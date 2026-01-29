import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Check, X } from "lucide-react";

interface Catalog {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  catalog_url: string;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  created_at: string;
}

const defaultFormData = {
  title: "",
  description: "",
  thumbnail_url: "",
  catalog_url: "",
  category: "",
  sort_order: 0,
  is_published: false,
};

const AdminCatalogs = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [deletingCatalog, setDeletingCatalog] = useState<Catalog | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const { toast } = useToast();

  const fetchCatalogs = async () => {
    const { data, error } = await supabase
      .from("catalogs")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) {
      setCatalogs(data);
    }
    if (error) {
      console.error("Error fetching catalogs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load catalogs",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const handleOpenDialog = (catalog?: Catalog) => {
    if (catalog) {
      setEditingCatalog(catalog);
      setFormData({
        title: catalog.title,
        description: catalog.description || "",
        thumbnail_url: catalog.thumbnail_url || "",
        catalog_url: catalog.catalog_url,
        category: catalog.category || "",
        sort_order: catalog.sort_order || 0,
        is_published: catalog.is_published || false,
      });
    } else {
      setEditingCatalog(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCatalog(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.catalog_url.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and Catalog URL are required",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingCatalog) {
        const { error } = await supabase
          .from("catalogs")
          .update({
            title: formData.title,
            description: formData.description || null,
            thumbnail_url: formData.thumbnail_url || null,
            catalog_url: formData.catalog_url,
            category: formData.category || null,
            sort_order: formData.sort_order,
            is_published: formData.is_published,
          })
          .eq("id", editingCatalog.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Catalog updated successfully",
        });
      } else {
        const { error } = await supabase.from("catalogs").insert({
          title: formData.title,
          description: formData.description || null,
          thumbnail_url: formData.thumbnail_url || null,
          catalog_url: formData.catalog_url,
          category: formData.category || null,
          sort_order: formData.sort_order,
          is_published: formData.is_published,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Catalog created successfully",
        });
      }

      handleCloseDialog();
      fetchCatalogs();
    } catch (error: any) {
      console.error("Error saving catalog:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save catalog",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCatalog) return;

    try {
      const { error } = await supabase
        .from("catalogs")
        .delete()
        .eq("id", deletingCatalog.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Catalog deleted successfully",
      });
      
      setDeleteDialogOpen(false);
      setDeletingCatalog(null);
      fetchCatalogs();
    } catch (error: any) {
      console.error("Error deleting catalog:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete catalog",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Catalogs</h1>
            <p className="text-muted-foreground">
              Manage your product catalogs and brand guides
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="btn-cta">
            <Plus className="w-4 h-4 mr-2" />
            Add Catalog
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : catalogs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No catalogs yet. Add your first one!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Published</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogs.map((catalog) => (
                  <TableRow key={catalog.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {catalog.title}
                        <a
                          href={catalog.catalog_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-accent"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {catalog.category || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {catalog.is_published ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {catalog.sort_order}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(catalog.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(catalog)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingCatalog(catalog);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCatalog ? "Edit Catalog" : "Add Catalog"}
            </DialogTitle>
            <DialogDescription>
              {editingCatalog
                ? "Update the catalog details below"
                : "Fill in the details to add a new catalog"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Nike Team Catalog 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Browse the latest Nike team apparel and gear..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog_url">Catalog URL *</Label>
              <Input
                id="catalog_url"
                value={formData.catalog_url}
                onChange={(e) =>
                  setFormData({ ...formData, catalog_url: e.target.value })
                }
                placeholder="https://example.com/catalog.pdf"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Team Sports"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <Label htmlFor="is_published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-cta">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCatalog ? "Save Changes" : "Add Catalog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Catalog</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCatalog?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCatalogs;
