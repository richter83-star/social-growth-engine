import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Crown, Eye, Edit3, CheckCircle2, XCircle, Search, Zap, Megaphone, Copy } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  owner:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  editor:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reviewer: "bg-green-500/20 text-green-400 border-green-500/30",
  viewer:   "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner:    <Crown className="h-3 w-3" />,
  editor:   <Edit3 className="h-3 w-3" />,
  reviewer: <CheckCircle2 className="h-3 w-3" />,
  viewer:   <Eye className="h-3 w-3" />,
};

const PERMISSION_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  canEdit:             { label: "Edit Comments",     icon: <Edit3 className="h-4 w-4" />,        description: "Can modify AI-generated comment text before posting" },
  canApprove:          { label: "Approve Comments",  icon: <CheckCircle2 className="h-4 w-4" />, description: "Can approve comments in the engagement queue" },
  canReject:           { label: "Reject Comments",   icon: <XCircle className="h-4 w-4" />,      description: "Can reject comments in the engagement queue" },
  canDiscover:         { label: "Run Discovery",     icon: <Search className="h-4 w-4" />,        description: "Can trigger thread discovery runs" },
  canManageCampaigns:  { label: "Manage Campaigns",  icon: <Megaphone className="h-4 w-4" />,    description: "Can create, edit, and delete campaigns" },
};

type TeamPermissions = {
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDiscover: boolean;
  canManageCampaigns: boolean;
};

type TeamRole = "editor" | "reviewer" | "viewer";

const ROLE_PRESETS: Record<string, TeamPermissions> = {
  editor:   { canEdit: true,  canApprove: false, canReject: false, canDiscover: true,  canManageCampaigns: false },
  reviewer: { canEdit: false, canApprove: true,  canReject: true,  canDiscover: false, canManageCampaigns: false },
  viewer:   { canEdit: false, canApprove: false, canReject: false, canDiscover: false, canManageCampaigns: false },
};

export default function Team() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: members = [], isLoading } = trpc.team.list.useQuery();
  const { data: myPerms } = trpc.team.getMyPermissions.useQuery();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("reviewer");
  const [invitePerms, setInvitePerms] = useState<TeamPermissions>(ROLE_PRESETS.reviewer);
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteUrl: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPerms, setEditPerms] = useState<TeamPermissions | null>(null);
  const [editRole, setEditRole] = useState<TeamRole>("reviewer");

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: (data) => {
      setInviteResult(data);
      utils.team.list.invalidate();
      toast.success("Invite created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setEditingId(null);
      toast.success("Permissions updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      toast.success("Team member removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRoleChange = (role: TeamRole) => {
    setInviteRole(role);
    setInvitePerms(ROLE_PRESETS[role]);
  };

  const handleEditRoleChange = (role: TeamRole) => {
    setEditRole(role);
    setEditPerms(ROLE_PRESETS[role]);
  };

  const handleInviteSubmit = () => {
    if (!inviteEmail) return;
    inviteMutation.mutate({ memberEmail: inviteEmail, teamRole: inviteRole, permissions: invitePerms });
  };

  const handleSaveEdit = (id: number) => {
    if (!editPerms) return;
    updateMutation.mutate({ id, teamRole: editRole, permissions: editPerms });
  };

  const startEdit = (member: typeof members[0]) => {
    setEditingId(member.id);
    setEditRole(member.teamRole as TeamRole);
    setEditPerms(member.permissions as TeamPermissions);
  };

  const isOwner = myPerms?.teamRole === "owner";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Team & Permissions
            </h1>
            <p className="text-muted-foreground mt-1">
              Control who can edit, approve, or reject AI-generated comments.
            </p>
          </div>
          {isOwner && (
            <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) { setInviteResult(null); setInviteEmail(""); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invite link to a collaborator. They will join your workspace with the permissions you define.
                  </DialogDescription>
                </DialogHeader>

                {inviteResult ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
                      <p className="font-medium text-green-400">Invite created!</p>
                      <p className="text-sm text-muted-foreground">Share this link with your team member:</p>
                    </div>
                    <div className="flex gap-2">
                      <Input value={inviteResult.inviteUrl} readOnly className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(inviteResult.inviteUrl); toast.success("Link copied!"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Token: <code className="bg-muted px-1 rounded">{inviteResult.token}</code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role Preset</Label>
                      <Select value={inviteRole} onValueChange={(v) => handleRoleChange(v as TeamRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor — can edit & discover</SelectItem>
                          <SelectItem value="reviewer">Reviewer — can approve & reject</SelectItem>
                          <SelectItem value="viewer">Viewer — read-only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />
                    <p className="text-sm font-medium">Fine-tune Permissions</p>
                    <div className="space-y-3">
                      {Object.entries(PERMISSION_LABELS).map(([key, meta]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{meta.icon}</span>
                            <div>
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{meta.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={invitePerms[key as keyof TeamPermissions]}
                            onCheckedChange={(v) => setInvitePerms((p) => ({ ...p, [key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {!inviteResult && (
                    <Button onClick={handleInviteSubmit} disabled={!inviteEmail || inviteMutation.isPending}>
                      {inviteMutation.isPending ? "Sending…" : "Create Invite"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    {inviteResult ? "Done" : "Cancel"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* My Permissions Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Your Permissions
              <Badge className={`ml-2 border text-xs ${ROLE_COLORS[myPerms?.teamRole ?? "owner"]}`}>
                <span className="flex items-center gap-1">
                  {ROLE_ICONS[myPerms?.teamRole ?? "owner"]}
                  {myPerms?.teamRole ?? "owner"}
                </span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myPerms && Object.entries(PERMISSION_LABELS).map(([key, meta]) => {
                const allowed = myPerms[key as keyof TeamPermissions];
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm ${allowed ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"}`}>
                    {allowed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {members.length === 0 ? "No team members yet. Invite collaborators to get started." : `${members.length} member${members.length !== 1 ? "s" : ""} in your workspace.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            )}

            {members.map((member) => {
              const isEditing = editingId === member.id;
              const perms = (isEditing ? editPerms : member.permissions) as TeamPermissions;

              return (
                <div key={member.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                  {/* Member header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                        {(member.memberName ?? member.memberEmail)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.memberName ?? member.memberEmail}</p>
                        <p className="text-xs text-muted-foreground">{member.memberEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border text-xs ${ROLE_COLORS[member.teamRole]}`}>
                        <span className="flex items-center gap-1">
                          {ROLE_ICONS[member.teamRole]}
                          {member.teamRole}
                        </span>
                      </Badge>
                      {!member.inviteAccepted && (
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">Pending</Badge>
                      )}
                      {isOwner && (
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => handleSaveEdit(member.id)} disabled={updateMutation.isPending}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(member)}>Edit</Button>
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => removeMutation.mutate({ id: member.id })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role selector (edit mode) */}
                  {isEditing && (
                    <div className="space-y-2">
                      <Label className="text-xs">Role Preset</Label>
                      <Select value={editRole} onValueChange={(v) => handleEditRoleChange(v as TeamRole)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Permissions grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, meta]) => {
                      const allowed = perms?.[key as keyof TeamPermissions] ?? false;
                      if (isEditing) {
                        return (
                          <div key={key} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                            <Switch
                              id={`${member.id}-${key}`}
                              checked={allowed}
                              onCheckedChange={(v) => setEditPerms((p) => p ? { ...p, [key]: v } : p)}
                              className="scale-75"
                            />
                            <Label htmlFor={`${member.id}-${key}`} className="text-xs cursor-pointer">{meta.label}</Label>
                          </div>
                        );
                      }
                      return (
                        <div key={key} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${allowed ? "text-green-400" : "text-zinc-600"}`}>
                          {allowed ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                          {meta.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!isLoading && members.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No team members yet</p>
                <p className="text-sm mt-1">Invite collaborators to manage your engagement queue together.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role reference table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Reference</CardTitle>
            <CardDescription>Default permissions assigned to each role preset.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Permission</th>
                    {["owner", "editor", "reviewer", "viewer"].map((role) => (
                      <th key={role} className="text-center py-2 px-3 font-medium">
                        <Badge className={`border text-xs ${ROLE_COLORS[role]}`}>
                          <span className="flex items-center gap-1">{ROLE_ICONS[role]}{role}</span>
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PERMISSION_LABELS).map(([key, meta]) => {
                    const presets: Record<string, TeamPermissions> = {
                      owner:    { canEdit: true,  canApprove: true,  canReject: true,  canDiscover: true,  canManageCampaigns: true },
                      editor:   ROLE_PRESETS.editor,
                      reviewer: ROLE_PRESETS.reviewer,
                      viewer:   ROLE_PRESETS.viewer,
                    };
                    return (
                      <tr key={key} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{meta.icon}</span>
                            <span>{meta.label}</span>
                          </div>
                        </td>
                        {["owner", "editor", "reviewer", "viewer"].map((role) => (
                          <td key={role} className="text-center py-2 px-3">
                            {presets[role][key as keyof TeamPermissions]
                              ? <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                              : <XCircle className="h-4 w-4 text-zinc-600 mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
