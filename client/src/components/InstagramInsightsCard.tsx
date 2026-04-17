/**
 * InstagramInsightsCard
 *
 * Displays Instagram-specific analytics:
 *  - KPI summary row (followers, delta, engagement rate)
 *  - Follower growth area chart (per-account lines)
 *  - Engagement rate sparkline
 *  - Empty state with link to Accounts page
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Instagram, TrendingUp, TrendingDown, Users, Heart, RefreshCw,
  Loader2, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Palette ──────────────────────────────────────────────────────────────────

const IG_GRADIENT_START = "oklch(0.68 0.22 340)"; // rose-pink
const IG_GRADIENT_END   = "oklch(0.72 0.22 50)";  // amber
const IG_LINE_COLORS = [
  "oklch(0.68 0.22 340)", // rose
  "oklch(0.70 0.20 280)", // purple
  "oklch(0.72 0.22 50)",  // amber
  "oklch(0.70 0.18 200)", // cyan
];

const TIME_RANGES = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function IgTooltip({
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
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-foreground font-medium">{p.name}:</span>
          <span className="text-foreground">
            {p.name === "Eng. Rate"
              ? `${p.value.toFixed(2)}%`
              : p.value >= 1_000_000
              ? `${(p.value / 1_000_000).toFixed(1)}M`
              : p.value >= 1_000
              ? `${(p.value / 1_000).toFixed(1)}k`
              : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Pill ─────────────────────────────────────────────────────────────────

function KpiPill({
  label, value, delta, format = "number",
}: {
  label: string;
  value: number;
  delta?: number;
  format?: "number" | "percent";
}) {
  const formatted =
    format === "percent"
      ? `${value.toFixed(2)}%`
      : value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : value.toLocaleString();

  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-muted/40 border border-border/50 min-w-[110px]">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground">{formatted}</p>
      {delta !== undefined && delta !== 0 && (
        <div className={`flex items-center gap-0.5 text-[11px] font-medium ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? "+" : ""}{delta.toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InstagramInsightsCard() {
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch, isFetching } = trpc.analytics.getInstagramInsights.useQuery(
    { days },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: postPerf, isLoading: postLoading } = trpc.analytics.getInstagramPostPerformance.useQuery(
    { days, limit: 5 },
    { staleTime: 5 * 60 * 1000 }
  );

  // Unique accounts in snapshots
  const accounts = useMemo(() => {
    if (!data?.accounts) return [];
    return data.accounts;
  }, [data]);

  // Pivot snapshots: { date → { [handle]: followers, engagementRate } }
  const growthChartData = useMemo(() => {
    if (!data?.snapshots) return [];
    const byDate = new Map<string, Record<string, number>>();
    for (const row of data.snapshots) {
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      byDate.get(row.date)![row.handle] = row.followers;
      byDate.get(row.date)!["__eng_" + row.handle] = row.engagementRate;
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [data]);

  // Engagement rate chart — average across all IG accounts per day
  const engChartData = useMemo(() => {
    if (!data?.snapshots) return [];
    const byDate = new Map<string, number[]>();
    for (const row of data.snapshots) {
      if (!byDate.has(row.date)) byDate.set(row.date, []);
      if (row.engagementRate > 0) byDate.get(row.date)!.push(row.engagementRate);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rates]) => ({
        date,
        "Eng. Rate": rates.length > 0 ? parseFloat((rates.reduce((s, v) => s + v, 0) / rates.length).toFixed(2)) : 0,
      }));
  }, [data]);

  const hasData = !isLoading && (data?.snapshots?.length ?? 0) > 0;
  const hasAccounts = !isLoading && (data?.accounts?.length ?? 0) > 0;
  const noAccounts = !isLoading && (data?.accounts?.length ?? 0) === 0;

  const tickFormatter = (v: string) => {
    const d = new Date(v + "T00:00:00");
    if (days <= 30) return `${d.getMonth() + 1}/${d.getDate()}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const xInterval = days <= 7 ? 0 : days <= 30 ? 4 : 13;

  // ── No Instagram accounts ────────────────────────────────────────────────────
  if (noAccounts) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-400" />
            Instagram Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-amber-500/20 flex items-center justify-center mb-4">
              <Instagram className="h-7 w-7 text-pink-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No Instagram accounts connected</p>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Add an Instagram account on the Accounts page to start tracking follower growth and engagement metrics here.
            </p>
            <Link href="/accounts">
              <Button size="sm" variant="outline" className="gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Go to Accounts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header card with KPI row ──────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              {/* Instagram gradient icon */}
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-amber-400 flex items-center justify-center flex-shrink-0">
                <Instagram className="h-3.5 w-3.5 text-white" />
              </div>
              Instagram Insights
              <Badge variant="secondary" className="text-[10px] font-normal ml-1">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
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

          {/* KPI pills */}
          {isLoading ? (
            <div className="flex items-center gap-2 mt-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading Instagram data…</span>
            </div>
          ) : hasAccounts && (
            <div className="flex flex-wrap gap-3 mt-3">
              <KpiPill
                label="Total Followers"
                value={data!.summary.totalFollowers}
                delta={data!.summary.followerDelta}
              />
              <KpiPill
                label={`Follower Δ (${days}d)`}
                value={Math.abs(data!.summary.followerDelta)}
                delta={data!.summary.followerDelta}
              />
              <KpiPill
                label="Avg Eng. Rate"
                value={data!.summary.avgEngagementRate}
                format="percent"
              />
              {/* Per-account current followers */}
              {accounts.map((acc) => (
                <div key={acc.id} className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-muted/40 border border-border/50 min-w-[110px]">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate max-w-[120px]">
                    @{acc.handle}
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {acc.followers >= 1_000_000
                      ? `${(acc.followers / 1_000_000).toFixed(1)}M`
                      : acc.followers >= 1_000
                      ? `${(acc.followers / 1_000).toFixed(1)}k`
                      : acc.followers.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {acc.following.toLocaleString()} following
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardHeader>

        {/* ── Follower Growth Chart ──────────────────────────────────────── */}
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[240px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-[240px] text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No follower history yet</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Snapshots are recorded automatically during nightly sync. Use <strong className="text-foreground">Sync Now</strong> on the Analytics page to capture your first data points.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Follower Growth</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={growthChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <defs>
                    {accounts.map((acc, i) => (
                      <linearGradient key={acc.id} id={`igGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={IG_LINE_COLORS[i % IG_LINE_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={IG_LINE_COLORS[i % IG_LINE_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                    tickFormatter={tickFormatter}
                    interval={xInterval}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k`
                      : String(v)
                    }
                    width={48}
                  />
                  <Tooltip content={<IgTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.02 250)", paddingTop: "8px" }}
                    formatter={(value: string) => `@${value}`}
                  />
                  {accounts.map((acc, i) => (
                    <Area
                      key={acc.id}
                      type="monotone"
                      dataKey={acc.handle}
                      name={acc.handle}
                      stroke={IG_LINE_COLORS[i % IG_LINE_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#igGrad${i})`}
                      dot={days <= 7}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Engagement Rate + Posted Comments ─────────────────────────────── */}
      {hasAccounts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Engagement Rate Sparkline */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-400" />
                Engagement Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {engChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[160px] text-center">
                  <p className="text-xs text-muted-foreground">No engagement data for this period.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={engChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                      tickFormatter={tickFormatter}
                      interval={xInterval}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }}
                      unit="%"
                      width={40}
                    />
                    <Tooltip content={<IgTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Eng. Rate"
                      stroke={IG_GRADIENT_START}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Posted Comments (Instagram) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" />
                Recent Instagram Engagements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {postLoading ? (
                <div className="flex items-center justify-center h-[160px]">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : !postPerf || postPerf.length === 0 ? (
                <div className="flex items-center justify-center h-[160px] text-center">
                  <p className="text-xs text-muted-foreground">No Instagram comments posted yet in this period.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {postPerf.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {item.threadTitle}
                          </span>
                          {item.threadUrl && (
                            <a
                              href={item.threadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-pink-500/30 text-pink-400"
                        >
                          {item.intentScore}% intent
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(item.postedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
