import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Upload, X, Loader2 } from "lucide-react";

interface UniformCard {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  image_url: string | null;
  icon: string | null;
  cta_text: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  featured_label: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  image_url: string;
  icon: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  featured_label: string;
}

const defaultFormData: FormData = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  image_url: "",
  icon: "",
  cta_text: "View Uniform Options",
  sort_order: 0,
  is_active: true,
  is_featured: false,
  featured_label: "",
};

export default function AdminUniforms() {
  const [cards, setCards] = useState<UniformCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<UniformCard | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchCards();
  };

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("uniform_cards")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load uniform cards.",
        variant: "destructive",
      });
    } else {
      setCards(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingCard(null);
    setFormData({
      ...defaultFormData,
      sort_order: cards.length > 0 ? Math.max(...cards.map(c => c.sort_order)) + 1 : 1,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (card: UniformCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      slug: card.slug,
      subtitle: card.subtitle || "",
      description: card.description,
      image_url: card.image_url || "",
      icon: card.icon || "",
      cta_text: card.cta_text || "View Uniform Options",
      sort_order: card.sort_order,
      is_active: card.is_active,
      is_featured: card.is_featured,
      featured_label: card.featured_label || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title: formData.title,
      slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      subtitle: formData.subtitle || null,
      description: formData.description,
      image_url: formData.image_url || null,
      icon: formData.icon || null,
      cta_text: formData.cta_text || "View Uniform Options",
      sort_order: formData.sort_order,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      featured_label: formData.featured_label || null,
    };

    let error;
    if (editingCard) {
      const { error: updateError } = await supabase
        .from("uniform_cards")
        .update(payload)
        .eq("id", editingCard.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("uniform_cards")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: editingCard ? "Card updated successfully." : "Card created successfully.",
      });
      setIsDialogOpen(false);
      fetchCards();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;

    const { error } = await supabase.from("uniform_cards").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Deleted", description: "Card deleted successfully." });
      fetchCards();
    }
  };

  const handleToggleActive = async (card: UniformCard) => {
    const { error } = await supabase
      .from("uniform_cards")
      .update({ is_active: !card.is_active })
      .eq("id", card.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchCards();
    }
  };

  const handleMoveOrder = async (card: UniformCard, direction: "up" | "down") => {
    const currentIndex = cards.findIndex(c => c.id === card.id);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (swapIndex < 0 || swapIndex >= cards.length) return;

    const swapCard = cards[swapIndex];
    
    await Promise.all([
      supabase.from("uniform_cards").update({ sort_order: swapCard.sort_order }).eq("id", card.id),
      supabase.from("uniform_cards").update({ sort_order: card.sort_order }).eq("id", swapCard.id),
    ]);
    
    fetchCards();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${formData.slug || Date.now()}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("uniform-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("uniform-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: urlData.publicUrl });
      
      toast({
        title: "Image uploaded",
        description: "Image uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Uniform Cards</h1>
            <p className="text-muted-foreground mt-1">
              Manage the sport cards displayed on the /uniforms page.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : cards.length === 0 ? (
          <p className="text-muted-foreground">No uniform cards found.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead className="w-12">Icon</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-24">Active</TableHead>
                  <TableHead className="w-24">Featured</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card, index) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-center">{card.sort_order}</span>
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(card, "up")}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === cards.length - 1}
                            onClick={() => handleMoveOrder(card, "down")}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xl">{card.icon}</TableCell>
                    <TableCell className="font-medium">{card.title}</TableCell>
                    <TableCell className="text-muted-foreground">{card.slug}</TableCell>
                    <TableCell>
                      <Switch
                        checked={card.is_active}
                        onCheckedChange={() => handleToggleActive(card)}
                      />
                    </TableCell>
                    <TableCell>
                      {card.is_featured && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                          {card.featured_label || "Featured"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(card)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(card.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? "Edit Uniform Card" : "Add Uniform Card"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated from title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (emoji)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🏈"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">Click to upload image</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_text">CTA Text</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
              </div>

              {formData.is_featured && (
                <div className="space-y-2">
                  <Label htmlFor="featured_label">Featured Label</Label>
                  <Input
                    id="featured_label"
                    value={formData.featured_label}
                    onChange={(e) => setFormData({ ...formData, featured_label: e.target.value })}
                    placeholder="Spring Season"
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingCard ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
