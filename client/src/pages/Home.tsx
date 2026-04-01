import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Users, Megaphone, Search, MessageSquareMore, TrendingUp,
  Zap, ArrowRight, CheckCircle, Clock, Bell
} from "lucide-react";
import { useEffect } from "react";

function StatCard({ title, value, icon: Icon, color, sub }: {
  title: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = trpc.analytics.summary.useQuery(undefined, { refetchInterval: 30000 });
  const { data: notifications } = trpc.notifications.list.useQuery({ limit: 5 }, { refetchInterval: 15000 });
  const { data: recentThreads } = trpc.discovery.getRecent.useQuery({ limit: 5 }, { refetchInterval: 20000 });
  const { data: queue } = trpc.engagement.getQueue.useQuery({ status: "pending" }, { refetchInterval: 20000 });
  const seedMutation = trpc.analytics.seedMetrics.useMutation();

  useEffect(() => {
    seedMutation.mutate();
  }, []);

  const unreadNotifs = notifications?.filter((n) => !n.isRead) ?? [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Growth Engine Overview
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your autonomous social media growth system at a glance
          </p>
        </div>
        <Button onClick={() => setLocation("/campaigns")} className="gap-2">
          <Megaphone className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard title="Connected Accounts" value={summary?.accounts ?? 0} icon={Users} color="bg-blue-600" sub="Active profiles" />
            <StatCard title="Active Campaigns" value={summary?.activeCampaigns ?? 0} icon={Megaphone} color="bg-violet-600" sub="Running now" />
            <StatCard title="Threads Discovered" value={summary?.threadsDiscovered ?? 0} icon={Search} color="bg-emerald-600" sub="Total found" />
            <StatCard title="Pending Approvals" value={summary?.pendingApprovals ?? 0} icon={Clock} color="bg-amber-600" sub="Awaiting review" />
            <StatCard title="Total Posted" value={summary?.totalPosted ?? 0} icon={CheckCircle} color="bg-teal-600" sub="Engagements sent" />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Threads */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Recently Discovered Threads
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/discovery")} className="gap-1 text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!recentThreads || recentThreads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No threads discovered yet.</p>
                  <p className="text-xs mt-1">Start a campaign and run discovery to find high-intent conversations.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/campaigns")}>
                    Create Campaign
                  </Button>
                </div>
              ) : (
                recentThreads.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                    <PlatformBadge platform={t.platform} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.threadTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.author} · {new Date(t.discoveredAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <IntentBadge score={t.intentScore ?? 0} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Notifications
                  {unreadNotifs.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">
                      {unreadNotifs.length}
                    </span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {unreadNotifs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No new notifications</p>
              ) : (
                unreadNotifs.slice(0, 4).map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pending Queue */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MessageSquareMore className="h-4 w-4 text-primary" />
                  Pending Queue
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/queue")} className="gap-1 text-muted-foreground hover:text-foreground">
                  Review <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!queue || queue.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Queue is empty</p>
              ) : (
                queue.slice(0, 3).map((q) => (
                  <div key={q.id} className="p-2.5 rounded-lg bg-muted/40">
                    <p className="text-xs text-foreground line-clamp-2">{q.generatedComment}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">Score: {q.confidenceScore?.toFixed(1)}/10</span>
                      <span className="text-xs text-amber-400 font-medium capitalize">{q.status}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Add Account", icon: Users, path: "/accounts", color: "text-blue-400" },
              { label: "New Campaign", icon: Megaphone, path: "/campaigns", color: "text-violet-400" },
              { label: "Run Discovery", icon: Search, path: "/discovery", color: "text-emerald-400" },
              { label: "View Analytics", icon: TrendingUp, path: "/analytics", color: "text-amber-400" },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => setLocation(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border hover:border-primary/30 transition-all duration-200 group"
              >
                <action.icon className={`h-6 w-6 ${action.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    twitter: "bg-sky-500/20 text-sky-400",
    reddit: "bg-orange-500/20 text-orange-400",
    linkedin: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${colors[platform] ?? "bg-muted text-muted-foreground"}`}>
      {platform}
    </span>
  );
}

function IntentBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-muted-foreground";
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400",
    queued: "bg-amber-500/20 text-amber-400",
    engaged: "bg-emerald-500/20 text-emerald-400",
    skipped: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
