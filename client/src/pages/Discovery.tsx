import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Zap, ExternalLink, Bot, Loader2, TrendingUp, Lock } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  reddit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  linkedin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  tiktok: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  queued: "bg-amber-500/20 text-amber-400",
  engaged: "bg-emerald-500/20 text-emerald-400",
  skipped: "bg-muted text-muted-foreground",
};

function IntentBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function Discovery() {
  const utils = trpc.useUtils();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const { data: threads, isLoading: threadsLoading } = trpc.discovery.getThreads.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );
  const { data: recentThreads, isLoading: recentLoading } = trpc.discovery.getRecent.useQuery({ limit: 30 });

  const discoverMutation = trpc.discovery.runDiscovery.useMutation({
    onSuccess: (data) => {
      utils.discovery.getThreads.invalidate();
      utils.discovery.getRecent.invalidate();
      utils.analytics.summary.invalidate();
      utils.notifications.list.invalidate();
      toast.success(`Discovered ${data.discovered} new threads!`);
    },
    onError: (e) => toast.error(`Discovery failed: ${e.message}`),
  });

  const generateMutation = trpc.engagement.generate.useMutation({
    onSuccess: () => {
      utils.engagement.getQueue.invalidate();
      utils.analytics.summary.invalidate();
      toast.success("AI comment generated and added to queue!");
    },
    onError: (e) => toast.error(e.message),
  });

  const activeCampaigns = campaigns?.filter((c) => c.status === "active") ?? [];
  const displayThreads = selectedCampaignId ? (threads ?? []) : (recentThreads ?? []);

  // Subscription tier from billing data
  const { data: billing } = trpc.billing.getSubscription.useQuery();
  const plan = billing?.plan ?? "free";
  // Free plan: 50 threads/month visible, rest locked
  const FREE_THREAD_LIMIT = 50;
  const isFreePlan = plan === "free";
  const visibleThreads = isFreePlan ? displayThreads.slice(0, FREE_THREAD_LIMIT) : displayThreads;
  const lockedCount = isFreePlan ? Math.max(0, displayThreads.length - FREE_THREAD_LIMIT) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Thread Discovery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered discovery of high-intent conversations across platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedCampaignId?.toString() ?? "all"}
            onValueChange={(v) => setSelectedCampaignId(v === "all" ? null : parseInt(v))}
          >
            <SelectTrigger className="w-52 bg-input border-border text-foreground">
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="gap-2"
            disabled={!selectedCampaignId || discoverMutation.isPending}
            onClick={() => selectedCampaignId && discoverMutation.mutate({ campaignId: selectedCampaignId })}
          >
            {discoverMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
            ) : (
              <><Zap className="h-4 w-4" />Run Discovery</>
            )}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      {activeCampaigns.length === 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              No active campaigns. Activate a campaign first, then select it above to run discovery.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Discovery Stats */}
      {displayThreads.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{displayThreads.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Threads Found</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {displayThreads.filter((t) => (t.intentScore ?? 0) >= 0.85).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">High Intent</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {displayThreads.filter((t) => t.status === "queued").length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">In Queue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Threads List */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            {selectedCampaignId ? "Campaign Threads" : "All Discovered Threads"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(threadsLoading || recentLoading) ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : displayThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No threads discovered yet</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                Select an active campaign and click "Run Discovery" to find high-intent conversations using the AI swarm engine.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleThreads.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${PLATFORM_COLORS[t.platform] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {PLATFORM_LABELS[t.platform] ?? t.platform}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-md capitalize ${STATUS_COLORS[t.status]}`}>
                          {t.status}
                        </span>
                        {(t.intentScore ?? 0) >= 0.85 && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-medium">
                            High Intent
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground leading-snug">{t.threadTitle}</h4>
                      {t.threadContent && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.threadContent}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Intent Score</p>
                      <IntentBar score={t.intentScore ?? 0} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Engagement Potential</p>
                      <IntentBar score={t.engagementPotential ?? 0} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">by @{t.author}</span>
                      <span className="text-xs text-muted-foreground">{new Date(t.discoveredAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={t.threadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <ExternalLink className="h-3 w-3" />View
                      </a>
                      {t.status === "new" && selectedCampaignId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                          disabled={generateMutation.isPending}
                          onClick={() => generateMutation.mutate({ threadId: t.id, campaignId: t.campaignId })}
                        >
                          <Bot className="h-3 w-3" />
                          {generateMutation.isPending ? "Generating..." : "Generate Comment"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Locked threads upsell */}
              {lockedCount > 0 && (
                <div className="relative">
                  {/* Blurred preview of next 3 threads */}
                  {displayThreads.slice(FREE_THREAD_LIMIT, FREE_THREAD_LIMIT + 3).map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-muted/30 border border-border mb-3 blur-sm select-none pointer-events-none opacity-60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t.platform}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">High Intent</span>
                      </div>
                      <div className="h-4 bg-muted/60 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted/40 rounded w-full" />
                    </div>
                  ))}
                  {/* Upgrade overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl border border-violet-500/30 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3">
                      <Lock className="h-5 w-5 text-violet-400" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {lockedCount} more thread{lockedCount !== 1 ? "s" : ""} discovered
                    </p>
                    <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                      You've reached the 50 thread/month limit on the Free plan. Upgrade to Pro for unlimited threads.
                    </p>
                    <a href="/billing">
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                        <Zap className="h-3.5 w-3.5" />
                        Upgrade to Pro — $49/mo
                      </Button>
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">Unlimited threads · 5 campaigns · Priority support</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
