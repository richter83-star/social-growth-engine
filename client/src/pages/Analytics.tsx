import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Users, MessageSquareMore, Brain, Loader2, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary:    "oklch(0.65 0.22 260)",
  secondary:  "oklch(0.70 0.18 180)",
  tertiary:   "oklch(0.75 0.18 140)",
  quaternary: "oklch(0.70 0.20 50)",
};

// Palette for per-account lines (cycles if > 8 accounts)
const ACCOUNT_COLORS = [
  "oklch(0.65 0.22 260)",  // violet
  "oklch(0.70 0.20 170)",  // teal
  "oklch(0.72 0.20 140)",  // green
  "oklch(0.72 0.22 50)",   // amber
  "oklch(0.65 0.22 20)",   // rose
  "oklch(0.68 0.20 310)",  // purple
  "oklch(0.70 0.18 200)",  // cyan
  "oklch(0.72 0.20 90)",   // lime
];

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📸",
  tiktok: "♪",
  reddit: "r/",
};

const TIME_RANGES = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-foreground font-medium">{p.name}:</span>
          <span className="text-foreground">
            {typeof p.value === "number" && p.name.includes("Rate")
              ? `${p.value.toFixed(1)}%`
              : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Follower Growth Chart ────────────────────────────────────────────────────

function FollowerGrowthChart({ onSyncNow, isSyncing }: { onSyncNow: () => void; isSyncing: boolean }) {
  const [days, setDays] = useState(30);
  const { data: rawData, isLoading, refetch, isFetching } = trpc.analytics.getFollowerGrowth.useQuery(
    { days },
    { staleTime: 5 * 60 * 1000 }
  );

  // Build a unique list of accounts present in the data
  const accounts = useMemo(() => {
    if (!rawData) return [];
    const seen = new Map<number, { accountId: number; handle: string; platform: string }>();
    for (const row of rawData) {
      if (row.accountId !== null && !seen.has(row.accountId)) {
        seen.set(row.accountId, {
          accountId: row.accountId,
          handle: row.handle,
          platform: row.platform,
        });
      }
    }
    return Array.from(seen.values());
  }, [rawData]);

  // Pivot: { date → { [handle]: followers } }
  const chartData = useMemo(() => {
    if (!rawData) return [];
    const byDate = new Map<string, Record<string, number>>();
    for (const row of rawData) {
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      byDate.get(row.date)![row.handle] = row.followers;
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [rawData]);

  // Net change for each account over the period
  const netChanges = useMemo(() => {
    if (!rawData || rawData.length === 0) return {};
    const byAccount: Record<string, { first: number; last: number }> = {};
    for (const row of rawData) {
      if (!byAccount[row.handle]) {
        byAccount[row.handle] = { first: row.followers, last: row.followers };
      } else {
        byAccount[row.handle].last = row.followers;
      }
    }
    return Object.fromEntries(
      Object.entries(byAccount).map(([handle, { first, last }]) => [handle, last - first])
    );
  }, [rawData]);

  const isEmpty = !isLoading && chartData.length === 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Follower Growth Over Time
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Time-range selector */}
            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
              {TIME_RANGES.map(({ label, days: d }) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    days === d
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Per-account net-change badges */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {accounts.map((acc, i) => {
              const delta = netChanges[acc.handle] ?? 0;
              return (
                <div
                  key={acc.accountId}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted/40 border border-border/50"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">
                    {PLATFORM_ICONS[acc.platform] ?? ""} {acc.handle}
                  </span>
                  {delta !== 0 && (
                    <span className={delta > 0 ? "text-emerald-400" : "text-rose-400"}>
                      {delta > 0 ? "+" : ""}{delta.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[280px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No follower data yet</p>
            <p className="text-xs text-muted-foreground/70 max-w-xs mb-4">
              Follower snapshots are recorded automatically each night when the daily sync runs.
              Use the <strong className="text-foreground">Sync Now</strong> button above to populate your first data points.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync Now"}
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                tickFormatter={(v: string) => {
                  // Show MM/DD for 7d, MM/DD for 30d, Mon DD for 90d
                  const d = new Date(v + "T00:00:00");
                  if (days <= 30) return `${d.getMonth() + 1}/${d.getDate()}`;
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
                interval={days <= 7 ? 0 : days <= 30 ? 4 : 13}
              />
              <YAxis
                tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000
                    ? `${(v / 1_000).toFixed(1)}k`
                    : String(v)
                }
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)", paddingTop: "8px" }}
                formatter={(value: string) => {
                  const acc = accounts.find((a) => a.handle === value);
                  return acc ? `${PLATFORM_ICONS[acc.platform] ?? ""} ${value}` : value;
                }}
              />
              {accounts.map((acc, i) => (
                <Line
                  key={acc.accountId}
                  type="monotone"
                  dataKey={acc.handle}
                  name={acc.handle}
                  stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                  strokeWidth={2}
                  dot={days <= 7}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function Analytics() {
  const utils = trpc.useUtils();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const syncMutation = trpc.accounts.syncMyAccounts.useMutation({
    onSuccess: (data) => {
      setLastSyncedAt(new Date().toLocaleTimeString());
      utils.analytics.getFollowerGrowth.invalidate();
      utils.analytics.metrics.invalidate();
      const msg = data.synced > 0
        ? `Synced ${data.synced} account${data.synced !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}.`
        : data.skipped > 0
        ? `No accounts with live data to sync (${data.skipped} skipped).`
        : "No active accounts found.";
      toast.success("Sync complete", { description: msg });
    },
    onError: (err) => {
      toast.error("Sync failed", { description: err.message });
    },
  });

  const { data: metrics, isLoading: metricsLoading } = trpc.analytics.metrics.useQuery({ days: 30 });
  const { data: roi } = trpc.analytics.roi.useQuery({ days: 30 });
  const { data: summary } = trpc.analytics.summary.useQuery();
  const { data: learning } = trpc.analytics.learningInsights.useQuery();

  const sortedMetrics = [...(metrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  const totalFollowerGrowth = sortedMetrics.reduce((sum, m) => sum + (m.followerDelta ?? 0), 0);
  const avgEngagementRate = sortedMetrics.length
    ? (sortedMetrics.reduce((sum, m) => sum + (m.engagementRate ?? 0), 0) / sortedMetrics.length).toFixed(2)
    : "0.00";
  const totalImpressions = sortedMetrics.reduce((sum, m) => sum + (m.impressions ?? 0), 0);
  const totalCommentsPosted = sortedMetrics.reduce((sum, m) => sum + (m.commentsPosted ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics & Performance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your growth, engagement performance, and AI learning insights
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing…" : "Sync Now"}
          </Button>
          {lastSyncedAt && (
            <p className="text-xs text-muted-foreground">Last synced at {lastSyncedAt}</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Follower Growth (30d)", value: `+${totalFollowerGrowth.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
          { title: "Avg Engagement Rate", value: `${avgEngagementRate}%`, icon: Users, color: "text-blue-400" },
          { title: "Total Impressions", value: totalImpressions.toLocaleString(), icon: BarChart3, color: "text-violet-400" },
          { title: "Comments Posted", value: totalCommentsPosted.toLocaleString(), icon: MessageSquareMore, color: "text-amber-400" },
          {
            title: "Estimated ROI",
            value: roi ? `${roi.roiPercent > 0 ? "+" : ""}${roi.roiPercent}%` : "—",
            icon: TrendingUp,
            color: roi && roi.roiPercent > 0 ? "text-emerald-400" : "text-muted-foreground",
          },
        ].map((kpi) => (
          <Card key={kpi.title} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Follower Growth Line Chart (per-account, time-range selector) */}
      <FollowerGrowthChart onSyncNow={() => syncMutation.mutate()} isSyncing={syncMutation.isPending} />

      {metricsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedMetrics.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">No metrics data yet. Start running campaigns to see analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Engagement Rate + Daily Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Engagement Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sortedMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
                    <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="engagementRate" name="Eng. Rate" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Daily Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sortedMetrics.slice(-14)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
                    <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)" }} />
                    <Bar dataKey="threadsDiscovered" name="Discovered" fill={CHART_COLORS.tertiary} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="commentsPosted" name="Posted" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* AI Learning Insights */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!learning || learning.totalOutcomes === 0 ? (
            <div className="p-4 rounded-lg bg-muted/40 text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">The AI learning engine will analyze your engagement outcomes and optimize strategy automatically once you start posting comments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground leading-relaxed">{learning.insight}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xl font-bold text-foreground">{learning.totalOutcomes}</p>
                  <p className="text-xs text-muted-foreground">Outcomes Analyzed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xl font-bold text-emerald-400">
                    {learning.outcomes.length > 0
                      ? (learning.outcomes.reduce((s, o) => s + (o.successScore ?? 0), 0) / learning.outcomes.length).toFixed(1)
                      : "0.0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Success Score</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xl font-bold text-blue-400">
                    {learning.outcomes[0]?.commentTone ?? "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Best Tone</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
