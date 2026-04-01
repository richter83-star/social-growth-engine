import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, MessageSquareMore, Brain, Loader2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

const CHART_COLORS = {
  primary: "oklch(0.65 0.22 260)",
  secondary: "oklch(0.70 0.18 180)",
  tertiary: "oklch(0.75 0.18 140)",
  quaternary: "oklch(0.70 0.20 50)",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-foreground font-medium">{p.name}:</span>
          <span className="text-foreground">{typeof p.value === "number" && p.name.includes("Rate") ? `${p.value.toFixed(1)}%` : p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics & Performance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your growth, engagement performance, and AI learning insights
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "Follower Growth (30d)", value: `+${totalFollowerGrowth.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
          { title: "Avg Engagement Rate", value: `${avgEngagementRate}%`, icon: Users, color: "text-blue-400" },
          { title: "Total Impressions", value: totalImpressions.toLocaleString(), icon: BarChart3, color: "text-violet-400" },
          { title: "Comments Posted", value: totalCommentsPosted.toLocaleString(), icon: MessageSquareMore, color: "text-amber-400" },
        { title: "Estimated ROI", value: roi ? `${roi.roiPercent > 0 ? "+" : ""}${roi.roiPercent}%` : "—", icon: TrendingUp, color: roi && roi.roiPercent > 0 ? "text-emerald-400" : "text-muted-foreground" },
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
          {/* Follower Growth Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Follower Growth (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={sortedMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 250)" />
                  <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: "oklch(0.60 0.02 250)", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="followers" name="Followers" stroke={CHART_COLORS.primary} fill="url(#followerGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Engagement Rate + Impressions */}
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
