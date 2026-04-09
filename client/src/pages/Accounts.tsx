import { useState, useEffect, useMemo, useCallback } from "react";
import Nango from "@nangohq/frontend";
import InstagramPanel from "@/components/InstagramPanel";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, RefreshCw, Twitter, Linkedin,
  CheckCircle2, AlertCircle, Clock, Link2, Unlink, ShieldCheck,
} from "lucide-react";

type Platform = "twitter" | "reddit" | "linkedin" | "instagram" | "tiktok";

type SyncStatus = "idle" | "loading" | "success" | "quota_exceeded" | "not_supported" | "error";

type SyncResult = {
  id: number;
  platform: string;
  handle: string;
  status: "success" | "quota_exceeded" | "not_supported" | "error";
  followers?: number;
  following?: number;
  displayName?: string;
  error?: string;
};

// SVG icons for platforms not in lucide-react
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
);

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  twitter: Twitter,
  linkedin: Linkedin,
  reddit: RedditIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "text-sky-400 bg-sky-500/10",
  reddit: "text-orange-400 bg-orange-500/10",
  linkedin: "text-blue-400 bg-blue-500/10",
  instagram: "text-pink-400 bg-pink-500/10",
  tiktok: "text-purple-400 bg-purple-500/10",
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter / X",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Platforms that support OAuth connect
const OAUTH_PLATFORMS = new Set(["twitter", "linkedin", "instagram"]);

const PLATFORMS: Platform[] = ["twitter", "reddit", "linkedin", "instagram", "tiktok"];

function SyncStatusIcon({ status }: { status: SyncStatus }) {
  if (status === "loading") return <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />;
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "quota_exceeded") return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />;
  if (status === "not_supported") return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  return null;
}

function syncStatusLabel(status: SyncStatus, result?: SyncResult): string {
  if (status === "loading") return "Syncing…";
  if (status === "success") return result?.followers !== undefined ? `${result.followers.toLocaleString()} followers` : "Profile updated";
  if (status === "quota_exceeded") return "API quota exceeded";
  if (status === "not_supported") return result?.error ?? "Connect account to sync";
  if (status === "error") return result?.error ?? "Sync failed";
  return "";
}

export default function Accounts() {
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.accounts.list.useQuery();

  // Stable account IDs for OAuth status query
  const accountIds = useMemo(() => accounts?.map((a) => a.id) ?? [], [accounts]);
  const { data: oauthStatus, refetch: refetchOAuthStatus } = trpc.accounts.getOAuthStatus.useQuery(
    { accountIds },
    { enabled: accountIds.length > 0 }
  );

  const createMutation = trpc.accounts.create.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate();
      utils.analytics.summary.invalidate();
      toast.success("Account connected!");
      setOpen(false);
      setForm({ platform: "twitter", handle: "", displayName: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.accounts.delete.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); utils.analytics.summary.invalidate(); toast.success("Account removed"); },
  });
  const updateMutation = trpc.accounts.update.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); },
  });
  const syncMutation = trpc.accounts.syncStats.useMutation({
    onSuccess: (results) => {
      utils.accounts.list.invalidate();
      const newStatuses: Record<number, SyncStatus> = {};
      const newResults: Record<number, SyncResult> = {};
      for (const r of results) {
        newStatuses[r.id] = r.status as SyncStatus;
        newResults[r.id] = r;
      }
      setSyncStatuses(prev => ({ ...prev, ...newStatuses }));
      setSyncResults(prev => ({ ...prev, ...newResults }));
      setSyncingAll(false);

      const succeeded = results.filter(r => r.status === "success").length;
      const failed = results.filter(r => r.status === "error").length;
      const quota = results.filter(r => r.status === "quota_exceeded").length;
      const unsupported = results.filter(r => r.status === "not_supported").length;

      if (succeeded > 0) toast.success(`Synced ${succeeded} account${succeeded > 1 ? "s" : ""} successfully`);
      if (quota > 0) toast.warning(`${quota} account${quota > 1 ? "s" : ""}: API quota exceeded`);
      if (unsupported > 0) toast.info(`${unsupported} platform${unsupported > 1 ? "s" : ""}: connect OAuth to enable sync`);
      if (failed > 0) toast.error(`${failed} account${failed > 1 ? "s" : ""} failed to sync`);
    },
    onError: (e) => {
      setSyncingAll(false);
      toast.error(`Sync failed: ${e.message}`);
    },
  });

  const [connectingAccountId, setConnectingAccountId] = useState<number | null>(null);

  const nangoSessionMutation = trpc.accounts.getNangoConnectSession.useMutation();
  const nangoConnectedMutation = trpc.accounts.nangoConnected.useMutation({
    onSuccess: () => {
      refetchOAuthStatus();
    },
  });

  const disconnectMutation = trpc.accounts.disconnectOAuth.useMutation({
    onSuccess: () => {
      refetchOAuthStatus();
      toast.success("Account disconnected");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ platform: Platform; handle: string; displayName: string }>({
    platform: "twitter",
    handle: "",
    displayName: "",
  });
  const [syncStatuses, setSyncStatuses] = useState<Record<number, SyncStatus>>({});
  const [syncResults, setSyncResults] = useState<Record<number, SyncResult>>({});
  const [syncingAll, setSyncingAll] = useState(false);

  // Nango connect handler — creates session token, opens popup, stores token
  const handleNangoConnect = useCallback(async (accountId: number, platform: "twitter" | "linkedin" | "instagram") => {
    setConnectingAccountId(accountId);
    try {
      const { sessionToken, integrationId, connectionId } = await nangoSessionMutation.mutateAsync({ accountId, platform });
      const nango = new Nango({ connectSessionToken: sessionToken });
      await nango.auth(integrationId, connectionId);
      // OAuth popup completed — store the token in our DB
      await nangoConnectedMutation.mutateAsync({ accountId, platform, connectionId });
      toast.success(`${PLATFORM_LABELS[platform]} connected successfully! Run Sync to pull live metrics.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("window_closed") && !msg.includes("user_cancelled")) {
        toast.error(`OAuth failed: ${msg}`);
      }
    } finally {
      setConnectingAccountId(null);
    }
  }, [nangoSessionMutation, nangoConnectedMutation]);

  const handleSyncOne = (accountId: number) => {
    setSyncStatuses(prev => ({ ...prev, [accountId]: "loading" }));
    syncMutation.mutate({ id: accountId });
  };

  const handleSyncAll = () => {
    if (!accounts || accounts.length === 0) return;
    setSyncingAll(true);
    const allLoading: Record<number, SyncStatus> = {};
    for (const a of accounts) allLoading[a.id] = "loading";
    setSyncStatuses(allLoading);
    syncMutation.mutate({ id: 0 });
  };

  const handleConnect = (accountId: number, platform: string) => {
    if (!OAUTH_PLATFORMS.has(platform)) {
      toast.info(`OAuth for ${PLATFORM_LABELS[platform] ?? platform} is coming soon`);
      return;
    }
    void handleNangoConnect(accountId, platform as "twitter" | "linkedin" | "instagram");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Social Accounts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your connected social media profiles</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts && accounts.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={syncingAll || syncMutation.isPending}
                  onClick={handleSyncAll}
                >
                  <RefreshCw className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
                  Sync All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Pull live follower counts from connected APIs</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Account</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Connect Social Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {PLATFORMS.map((p) => {
                        const Icon = PLATFORM_ICONS[p];
                        const color = PLATFORM_COLORS[p];
                        return (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              <span className={`p-1 rounded ${color}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              {PLATFORM_LABELS[p]}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Handle / Username</Label>
                  <Input
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    placeholder="@yourusername"
                    value={form.handle}
                    onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Display Name (optional)</Label>
                  <Input
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    placeholder="Your Name"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  />
                </div>
                {(form.platform === "instagram" || form.platform === "tiktok") && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-purple-300">
                      {form.platform === "instagram"
                        ? "Instagram requires a Professional (Business/Creator) account for metric sync via OAuth."
                        : "TikTok monitoring discovers trending videos and comment threads matching your campaign keywords."}
                    </p>
                  </div>
                )}
                {OAUTH_PLATFORMS.has(form.platform) && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-300">
                      After adding, use the <strong>Connect OAuth</strong> button on the card to authorize {PLATFORM_LABELS[form.platform]} and unlock private metrics.
                    </p>
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={!form.handle || createMutation.isPending}
                  onClick={() => createMutation.mutate({ platform: form.platform, handle: form.handle, displayName: form.displayName || undefined })}
                >
                  {createMutation.isPending ? "Connecting..." : `Add ${PLATFORM_LABELS[form.platform]} Account`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="p-5 h-32" />
            </Card>
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No accounts connected</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Connect your Twitter, Reddit, LinkedIn, Instagram, or TikTok accounts to start monitoring and engaging with conversations.</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add Your First Account</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const PlatformIcon = PLATFORM_ICONS[acc.platform] ?? Users;
            const colorClass = PLATFORM_COLORS[acc.platform] ?? "text-muted-foreground bg-muted";
            const syncStatus = syncStatuses[acc.id] ?? "idle";
            const syncResult = syncResults[acc.id];
            const isSyncing = syncStatus === "loading";
            const isOAuthSupported = OAUTH_PLATFORMS.has(acc.platform);
            const isConnected = oauthStatus?.[acc.id] ?? false;
            const isConnecting = connectingAccountId === acc.id;
            const isDisconnecting = disconnectMutation.isPending;

            return (
              <Card key={acc.id} className={`bg-card border-border hover:border-primary/30 transition-all ${isSyncing ? "opacity-80" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${colorClass}`}>
                        <PlatformIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground">{acc.displayName ?? acc.handle}</p>
                          {isConnected && (
                            <Tooltip>
                              <TooltipTrigger>
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">OAuth connected — private metrics enabled</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{acc.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Sync Stats button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            disabled={isSyncing || syncMutation.isPending}
                            onClick={() => handleSyncOne(acc.id)}
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Sync live stats from {PLATFORM_LABELS[acc.platform]}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Switch
                        checked={acc.isActive}
                        onCheckedChange={(v) => updateMutation.mutate({ id: acc.id, isActive: v })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate({ id: acc.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-muted/40">
                      <p className="text-lg font-bold text-foreground">{(acc.followers ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/40">
                      <p className="text-lg font-bold text-foreground">{(acc.following ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/40">
                      <p className="text-lg font-bold text-foreground">{(acc.engagementRate ?? 0).toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Eng. Rate</p>
                    </div>
                  </div>

                  {/* OAuth Connect / Disconnect row */}
                  {isOAuthSupported && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      {isConnected ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">OAuth connected</span>
                            <span className="text-xs text-muted-foreground">— private metrics active</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                                disabled={isDisconnecting}
                                onClick={() => disconnectMutation.mutate({ accountId: acc.id })}
                              >
                                <Unlink className="h-3 w-3" />
                                Disconnect
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Remove stored OAuth token</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Connect OAuth to unlock private metrics
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                            disabled={isConnecting}
                            onClick={() => handleConnect(acc.id, acc.platform)}
                          >
                            <Link2 className="h-3 w-3" />
                            Connect {PLATFORM_LABELS[acc.platform]}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className={`text-xs capitalize border-0 ${colorClass}`}>
                      {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                    </Badge>

                    {/* Sync status row */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {syncStatus !== "idle" && (
                        <>
                          <SyncStatusIcon status={syncStatus} />
                          <span className={`text-xs ${
                            syncStatus === "success" ? "text-emerald-400" :
                            syncStatus === "quota_exceeded" ? "text-amber-400" :
                            syncStatus === "error" ? "text-destructive" :
                            "text-muted-foreground"
                          }`}>
                            {syncStatusLabel(syncStatus, syncResult)}
                          </span>
                          <span className="text-muted-foreground/40 text-xs">·</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {acc.lastSynced ? `Synced ${new Date(acc.lastSynced).toLocaleDateString()}` : "Never synced"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Instagram Live Stats Panel (MCP connected) */}
      <InstagramPanel />

      {/* API coverage info banner */}
      {accounts && accounts.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-1">
          <p className="text-xs font-medium text-foreground">OAuth coverage &amp; private metrics</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-sky-400">Twitter/X</span> — follower count, following, tweet count (OAuth required for authenticated requests).{" "}
            <span className="text-blue-400">LinkedIn</span> — display name verification (follower counts not exposed by LinkedIn's public API).{" "}
            <span className="text-pink-400">Instagram</span> — follower count &amp; media count (requires Professional account + OAuth).{" "}
            <span className="text-muted-foreground">TikTok, Reddit</span> — sync not yet supported.
          </p>
          <p className="text-xs text-muted-foreground">
            To connect OAuth: click <strong className="text-foreground">Connect [Platform]</strong> on each card. A secure popup will open for authorization. Tokens are AES-256 encrypted at rest.
          </p>
        </div>
      )}
    </div>
  );
}
