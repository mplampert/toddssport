import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, UserPlus, Users, Shield, Mail, Loader2,
} from "lucide-react";
import { format } from "date-fns";

// ── Role definitions and default permissions ──

const STAFF_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "production", label: "Production" },
  { value: "bookkeeper", label: "Bookkeeper" },
  { value: "developer", label: "Developer" },
] as const;

const SIDEBAR_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "master_catalog", label: "Master Catalog" },
  { key: "catalogs", label: "Catalogs" },
  { key: "team_stores", label: "Team Stores" },
  { key: "orders", label: "Orders" },
  { key: "fulfillment", label: "Fulfillment" },
  { key: "reps", label: "Sales Reps" },
  { key: "uniforms", label: "Uniform Cards" },
  { key: "champro_orders", label: "Champro Orders" },
  { key: "champro_pricing", label: "Champro Pricing" },
  { key: "catalog_products", label: "Product Catalog" },
  { key: "promo_products", label: "Promo Products" },
  { key: "reports", label: "Reports" },
  { key: "customers", label: "Customers" },
  { key: "staff_users", label: "Staff Users" },
  { key: "settings", label: "Settings" },
  { key: "notifications", label: "Notifications" },
  { key: "sample_data", label: "Sample Data" },
  { key: "lookbook", label: "Lookbook Generator" },
  { key: "flyers", label: "Sales Flyers" },
  { key: "message_gen", label: "AI Message Gen" },
  { key: "dev_tools", label: "Dev Tools" },
] as const;

type TabKey = typeof SIDEBAR_TABS[number]["key"];

const DEFAULT_PERMISSIONS: Record<string, TabKey[]> = {
  owner: SIDEBAR_TABS.map((t) => t.key),
  admin: SIDEBAR_TABS.map((t) => t.key),
  sales: [
    "dashboard", "team_stores", "orders", "customers", "reps",
    "catalogs", "master_catalog", "promo_products",
  ],
  production: [
    "dashboard", "orders", "fulfillment", "champro_orders", "team_stores",
  ],
  bookkeeper: [
    "dashboard", "orders", "reports", "team_stores",
  ],
  developer: [
    "dashboard", "dev_tools", "sample_data", "master_catalog",
  ],
};

function getDefaultTabs(role: string): Set<TabKey> {
  return new Set(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.sales);
}

// ── Types ──

interface StaffUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  staff_role: string;
  is_active: boolean;
  invite_status: string;
  last_login_at: string | null;
  created_at: string;
}

interface StaffPermission {
  employee_id: string;
  tab_key: string;
  can_view: boolean;
}

// ── Component ──

export default function AdminStaffUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [editPerms, setEditPerms] = useState<Set<TabKey>>(new Set());
  const [invPerms, setInvPerms] = useState<Set<TabKey>>(getDefaultTabs("sales"));

  // Invite form state
  const [invForm, setInvForm] = useState({
    email: "", first_name: "", last_name: "", phone: "", staff_role: "sales",
  });

  // ── Queries ──

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["admin-staff-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StaffUser[];
    },
  });

  const { data: allPerms = [] } = useQuery({
    queryKey: ["admin-staff-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_permissions")
        .select("employee_id, tab_key, can_view");
      if (error) throw error;
      return (data || []) as StaffPermission[];
    },
  });

  // ── Invite mutation ──

  const inviteMut = useMutation({
    mutationFn: async (form: typeof invForm) => {
      const res = await supabase.functions.invoke("invite-staff", {
        body: form,
      });
      if (res.error) throw new Error(res.error.message || "Invite failed");
      if (res.data?.error) throw new Error(res.data.error);

      // Save sidebar permissions for the new user
      const userId = res.data?.userId;
      if (userId) {
        const rows = SIDEBAR_TABS.map((tab) => ({
          employee_id: userId,
          tab_key: tab.key,
          can_view: invPerms.has(tab.key),
        }));
        await supabase.from("staff_permissions").upsert(rows, { onConflict: "employee_id,tab_key" });
      }

      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Invite sent", description: `Invite email sent to ${invForm.email}` });
      setInviteOpen(false);
      setInvForm({ email: "", first_name: "", last_name: "", phone: "", staff_role: "sales" });
      setInvPerms(getDefaultTabs("sales"));
      qc.invalidateQueries({ queryKey: ["admin-staff-users"] });
      qc.invalidateQueries({ queryKey: ["admin-staff-permissions"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Edit / save permissions ──

  const openEdit = (user: StaffUser) => {
    setEditUser(user);
    // Load custom permissions or fall back to role defaults
    const userPerms = allPerms.filter((p) => p.employee_id === user.id);
    if (userPerms.length > 0) {
      setEditPerms(new Set(userPerms.filter((p) => p.can_view).map((p) => p.tab_key as TabKey)));
    } else {
      setEditPerms(getDefaultTabs(user.staff_role));
    }
  };

  const saveEditMut = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      // Update employee profile
      const { error: epErr } = await supabase
        .from("employee_profiles")
        .update({
          staff_role: editUser.staff_role,
          is_active: editUser.is_active,
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          phone: editUser.phone,
        })
        .eq("id", editUser.id);
      if (epErr) throw epErr;

      // Delete existing permissions and re-insert
      await supabase.from("staff_permissions").delete().eq("employee_id", editUser.id);

      const rows = SIDEBAR_TABS.map((tab) => ({
        employee_id: editUser.id,
        tab_key: tab.key,
        can_view: editPerms.has(tab.key),
      }));

      const { error: pErr } = await supabase.from("staff_permissions").insert(rows);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Staff user updated" });
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ["admin-staff-users"] });
      qc.invalidateQueries({ queryKey: ["admin-staff-permissions"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePerm = (key: TabKey) => {
    setEditPerms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const resetToDefaults = () => {
    if (editUser) setEditPerms(getDefaultTabs(editUser.staff_role));
  };

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      owner: "bg-amber-100 text-amber-800",
      admin: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      production: "bg-purple-100 text-purple-800",
      bookkeeper: "bg-teal-100 text-teal-800",
      developer: "bg-orange-100 text-orange-800",
    };
    return map[role] || "bg-muted text-muted-foreground";
  };

  const inviteColor = (status: string) => {
    if (status === "active") return "bg-green-100 text-green-800";
    if (status === "invited") return "bg-yellow-100 text-yellow-800";
    return "bg-muted text-muted-foreground";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-accent" />
              Staff Users
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage staff accounts, roles, and sidebar permissions
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Staff User
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold">{staff.filter((s) => s.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{staff.filter((s) => s.invite_status === "invited").length}</p>
                <p className="text-xs text-muted-foreground">Pending Invites</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {staff.filter((s) => s.staff_role === "owner" || s.staff_role === "admin").length}
                </p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invite</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColor(u.staff_role)}>
                        {u.staff_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={inviteColor(u.invite_status)}>
                        {u.invite_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.last_login_at
                        ? format(new Date(u.last_login_at), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ── Invite Dialog ── */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invite Staff User</DialogTitle>
              <DialogDescription>
                Configure role and sidebar access, then send the invite email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input
                    value={invForm.first_name}
                    onChange={(e) => setInvForm({ ...invForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input
                    value={invForm.last_name}
                    onChange={(e) => setInvForm({ ...invForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={invForm.email}
                  onChange={(e) => setInvForm({ ...invForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={invForm.phone}
                  onChange={(e) => setInvForm({ ...invForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select
                  value={invForm.staff_role}
                  onValueChange={(v) => {
                    setInvForm({ ...invForm, staff_role: v });
                    setInvPerms(getDefaultTabs(v));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sidebar Access */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Sidebar Access</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInvPerms(getDefaultTabs(invForm.staff_role))}
                  >
                    Reset to Defaults
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SIDEBAR_TABS.map((tab) => (
                    <label
                      key={tab.key}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                    >
                      <Checkbox
                        checked={invPerms.has(tab.key)}
                        onCheckedChange={() => {
                          setInvPerms((prev) => {
                            const next = new Set(prev);
                            next.has(tab.key) ? next.delete(tab.key) : next.add(tab.key);
                            return next;
                          });
                        }}
                      />
                      {tab.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button
                onClick={() => inviteMut.mutate(invForm)}
                disabled={inviteMut.isPending || !invForm.email || !invForm.first_name}
              >
                {inviteMut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Send Invite</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Dialog with Sidebar Permissions ── */}
        <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff User</DialogTitle>
            </DialogHeader>
            {editUser && (
              <div className="space-y-5 py-2">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First Name</Label>
                    <Input
                      value={editUser.first_name || ""}
                      onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name</Label>
                    <Input
                      value={editUser.last_name || ""}
                      onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={editUser.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={editUser.phone || ""}
                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    value={editUser.staff_role}
                    onValueChange={(v) => {
                      setEditUser({ ...editUser, staff_role: v });
                      // Reset perms to new role defaults
                      setEditPerms(getDefaultTabs(v));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editUser.is_active}
                    onCheckedChange={(c) => setEditUser({ ...editUser, is_active: c })}
                  />
                  <Label>Active</Label>
                </div>

                {/* Sidebar Access */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Sidebar Access</h3>
                    <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                      Reset to Defaults
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SIDEBAR_TABS.map((tab) => (
                      <label
                        key={tab.key}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
                      >
                        <Checkbox
                          checked={editPerms.has(tab.key)}
                          onCheckedChange={() => togglePerm(tab.key)}
                        />
                        {tab.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={() => saveEditMut.mutate()} disabled={saveEditMut.isPending}>
                {saveEditMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
