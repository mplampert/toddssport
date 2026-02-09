import { useState, useRef } from "react";
import { useTeamStoreContext } from "@/components/admin/team-stores/useTeamStoreContext";
import {
  useStoreRosters,
  useRosterPlayers,
  useCreateRoster,
  useUpdateRoster,
  useDeleteRoster,
  useUpsertPlayer,
  useDeletePlayer,
  useBulkImportPlayers,
  type TeamRoster,
  type RosterPlayer,
} from "@/hooks/useTeamRosters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Pencil, Download, Upload, Users, Loader2, Save, X,
} from "lucide-react";
import { toast } from "sonner";

/* ─── CSV helpers ─── */
function playersToCSV(players: RosterPlayer[]): string {
  const headers = ["first_name", "last_name", "jersey_number", "position", "grad_year", "birth_year", "email", "phone", "guardian_name", "guardian_email", "status", "notes"];
  const rows = players.map((p) => [
    p.player_first_name, p.player_last_name, p.jersey_number, p.position ?? "",
    p.grad_year?.toString() ?? "", p.birth_year?.toString() ?? "",
    p.player_email ?? "", p.player_phone ?? "", p.guardian_name ?? "", p.guardian_email ?? "",
    p.status, p.notes ?? "",
  ].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function parseCSV(text: string, rosterId: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
    const get = (key: string) => vals[headers.indexOf(key)] || null;
    return {
      team_roster_id: rosterId,
      player_first_name: get("first_name") || "Unknown",
      player_last_name: get("last_name") || "",
      jersey_number: get("jersey_number") || get("number") || "0",
      status: (get("status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
      position: get("position"),
      grad_year: get("grad_year") ? parseInt(get("grad_year")!) : null,
      birth_year: get("birth_year") ? parseInt(get("birth_year")!) : null,
      player_email: get("email"),
      player_phone: get("phone"),
      guardian_name: get("guardian_name"),
      guardian_email: get("guardian_email"),
      notes: get("notes"),
    };
  });
}

/* ─── Player Editor Row ─── */
function PlayerRow({
  player,
  onSave,
  onDelete,
  onCancel,
  isNew,
}: {
  player: Partial<RosterPlayer>;
  onSave: (p: Partial<RosterPlayer>) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  isNew?: boolean;
}) {
  const [form, setForm] = useState(player);
  const patch = (u: Partial<RosterPlayer>) => setForm((f) => ({ ...f, ...u }));

  return (
    <TableRow>
      <TableCell>
        <Input value={form.jersey_number ?? ""} onChange={(e) => patch({ jersey_number: e.target.value })} className="w-16 h-8 text-xs" />
      </TableCell>
      <TableCell>
        <Input value={form.player_first_name ?? ""} onChange={(e) => patch({ player_first_name: e.target.value })} className="h-8 text-xs" placeholder="First" />
      </TableCell>
      <TableCell>
        <Input value={form.player_last_name ?? ""} onChange={(e) => patch({ player_last_name: e.target.value })} className="h-8 text-xs" placeholder="Last" />
      </TableCell>
      <TableCell>
        <Input value={form.position ?? ""} onChange={(e) => patch({ position: e.target.value || null })} className="h-8 text-xs" placeholder="Position" />
      </TableCell>
      <TableCell>
        <Input type="number" value={form.grad_year ?? ""} onChange={(e) => patch({ grad_year: e.target.value ? parseInt(e.target.value) : null })} className="w-20 h-8 text-xs" placeholder="Year" />
      </TableCell>
      <TableCell>
        <Input value={form.player_email ?? ""} onChange={(e) => patch({ player_email: e.target.value || null })} className="h-8 text-xs" placeholder="Email" />
      </TableCell>
      <TableCell>
        <Select value={form.status ?? "active"} onValueChange={(v) => patch({ status: v as "active" | "inactive" })}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {form.claimed_order_item_id ? (
          <Badge variant="secondary" className="text-[10px]">Claimed</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onSave(form)}>
          <Save className="w-3.5 h-3.5" />
        </Button>
        {isNew && onCancel && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
        {!isNew && onDelete && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ─── Main Component ─── */
export default function StoreRosters() {
  const { store } = useTeamStoreContext();
  const { data: rosters = [], isLoading } = useStoreRosters(store.id);
  const createRoster = useCreateRoster(store.id);
  const updateRoster = useUpdateRoster();
  const deleteRoster = useDeleteRoster();

  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [showNewRoster, setShowNewRoster] = useState(false);
  const [newRosterName, setNewRosterName] = useState("");
  const [newRosterSeason, setNewRosterSeason] = useState("");
  const [newRosterSport, setNewRosterSport] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

  const selectedRoster = rosters.find((r) => r.id === selectedRosterId) ?? null;
  const { data: players = [], isLoading: playersLoading } = useRosterPlayers(selectedRosterId);
  const upsertPlayer = useUpsertPlayer(selectedRosterId ?? "");
  const deletePlayerMut = useDeletePlayer(selectedRosterId ?? "");
  const bulkImport = useBulkImportPlayers(selectedRosterId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateRoster = () => {
    if (!newRosterName.trim()) return;
    createRoster.mutate(
      { name: newRosterName.trim(), season: newRosterSeason || undefined, sport: newRosterSport || undefined },
      {
        onSuccess: (r) => {
          setSelectedRosterId(r.id);
          setShowNewRoster(false);
          setNewRosterName("");
          setNewRosterSeason("");
          setNewRosterSport("");
        },
      }
    );
  };

  const handleSavePlayer = (p: Partial<RosterPlayer>) => {
    if (!p.player_first_name?.trim() || !p.jersey_number?.trim()) {
      toast.error("First name and jersey number are required");
      return;
    }
    upsertPlayer.mutate(
      { ...p, team_roster_id: selectedRosterId! } as any,
      { onSuccess: () => setAddingPlayer(false) }
    );
  };

  const handleExportCSV = () => {
    if (!players.length) return;
    const csv = playersToCSV(players);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedRoster?.name ?? "roster"}-players.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRosterId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, selectedRosterId);
      if (parsed.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }
      bulkImport.mutate(parsed as any);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Rosters</h2>
          <p className="text-sm text-muted-foreground">
            Manage player rosters for Name &amp; Number personalization.
          </p>
        </div>
        <Dialog open={showNewRoster} onOpenChange={setShowNewRoster}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Roster</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Roster</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Roster Name *</Label>
                <Input value={newRosterName} onChange={(e) => setNewRosterName(e.target.value)} placeholder="e.g. Panthers 12U 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Season</Label>
                  <Input value={newRosterSeason} onChange={(e) => setNewRosterSeason(e.target.value)} placeholder="e.g. Spring 2026" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sport</Label>
                  <Input value={newRosterSport} onChange={(e) => setNewRosterSport(e.target.value)} placeholder="e.g. Baseball" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateRoster} disabled={createRoster.isPending || !newRosterName.trim()}>
                {createRoster.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roster list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rosters.map((roster) => (
          <Card
            key={roster.id}
            className={`cursor-pointer transition-colors ${selectedRosterId === roster.id ? "ring-2 ring-accent" : "hover:bg-muted/30"}`}
            onClick={() => setSelectedRosterId(roster.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{roster.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[roster.sport, roster.season].filter(Boolean).join(" · ") || "No details"}
                  </p>
                </div>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
        {rosters.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-4">No rosters yet. Create one to get started.</p>
        )}
      </div>

      {/* Selected roster player management */}
      {selectedRoster && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {selectedRoster.name}
                  <Badge variant="secondary" className="text-xs">{players.length} players</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {[selectedRoster.sport, selectedRoster.season].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkImport.isPending}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Import CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={players.length === 0}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </Button>
                <Button size="sm" onClick={() => setAddingPlayer(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Player
                </Button>
                <Button
                  size="sm" variant="destructive"
                  onClick={() => { if (confirm(`Delete roster "${selectedRoster.name}"?`)) { deleteRoster.mutate(selectedRoster.id); setSelectedRosterId(null); } }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {playersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead className="w-20">Grad Yr</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20">Claimed</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addingPlayer && (
                      <PlayerRow
                        player={{ team_roster_id: selectedRosterId!, status: "active", jersey_number: "", player_first_name: "", player_last_name: "" }}
                        onSave={handleSavePlayer}
                        onCancel={() => setAddingPlayer(false)}
                        isNew
                      />
                    )}
                    {players.map((p) => (
                      <PlayerRow
                        key={p.id}
                        player={p}
                        onSave={handleSavePlayer}
                        onDelete={() => deletePlayerMut.mutate(p.id)}
                      />
                    ))}
                    {!addingPlayer && players.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                          No players. Add individually or import a CSV.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
