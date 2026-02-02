import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  territory_type: string;
  territory_value: string;
  notes: string | null;
  active: boolean;
  created_at: string;
}

const emptyRep = {
  name: "",
  email: "",
  phone: "",
  territory_type: "school",
  territory_value: "",
  notes: "",
  active: true,
};

export default function AdminReps() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Partial<Rep> | null>(null);
  const [formData, setFormData] = useState(emptyRep);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      const { data, error } = await supabase
        .from("reps")
        .select("*")
        .order("name");

      if (error) throw error;
      setReps(data || []);
    } catch (error) {
      console.error("Error fetching reps:", error);
      toast({
        title: "Error",
        description: "Failed to load representatives.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (rep?: Rep) => {
    if (rep) {
      setEditingRep(rep);
      setFormData({
        name: rep.name,
        email: rep.email,
        phone: rep.phone || "",
        territory_type: rep.territory_type,
        territory_value: rep.territory_value,
        notes: rep.notes || "",
        active: rep.active,
      });
    } else {
      setEditingRep(null);
      setFormData(emptyRep);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRep(null);
    setFormData(emptyRep);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.territory_value) {
      toast({
        title: "Validation Error",
        description: "Name, email, and territory value are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingRep?.id) {
        // Update
        const { error } = await supabase
          .from("reps")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            territory_type: formData.territory_type,
            territory_value: formData.territory_value,
            notes: formData.notes || null,
            active: formData.active,
          })
          .eq("id", editingRep.id);

        if (error) throw error;
        toast({ title: "Success", description: "Representative updated." });
      } else {
        // Insert
        const { error } = await supabase.from("reps").insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          territory_type: formData.territory_type,
          territory_value: formData.territory_value,
          notes: formData.notes || null,
          active: formData.active,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Representative created." });
      }

      handleCloseDialog();
      fetchReps();
    } catch (error) {
      console.error("Error saving rep:", error);
      toast({
        title: "Error",
        description: "Failed to save representative.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this representative?")) return;

    try {
      const { error } = await supabase.from("reps").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Representative removed." });
      fetchReps();
    } catch (error) {
      console.error("Error deleting rep:", error);
      toast({
        title: "Error",
        description: "Failed to delete representative.",
        variant: "destructive",
      });
    }
  };

  const getTerritoryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      zip: "Zip Code",
      school: "School",
      city: "City",
      league: "League",
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Representatives</h1>
            <p className="text-muted-foreground">
              Manage your sales reps and their territories
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rep
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : reps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No representatives yet. Click "Add Rep" to create one.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.email}</TableCell>
                    <TableCell>{rep.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {getTerritoryTypeLabel(rep.territory_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {rep.territory_value}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rep.active ? "default" : "secondary"}>
                        {rep.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rep)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rep.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRep ? "Edit Representative" : "Add Representative"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@toddssport.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="territory_type">Territory Type *</Label>
                <Select
                  value={formData.territory_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, territory_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="zip">Zip Code</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="territory_value">Territory Value *</Label>
                <Input
                  id="territory_value"
                  value={formData.territory_value}
                  onChange={(e) =>
                    setFormData({ ...formData, territory_value: e.target.value })
                  }
                  placeholder="e.g., Lincoln High School, Springfield, 62701"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes about this territory..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
