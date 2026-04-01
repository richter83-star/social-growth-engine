import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Users, DollarSign, TrendingUp, Activity, MessageSquare,
  Server, Search, ChevronDown, ChevronUp, RefreshCw,
  Crown, Shield, AlertTriangle, CheckCircle, Clock,
  BarChart2, PieChart as PieChartIcon, Zap, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "sonner";

const PLAN_COLORS = { free: "#6b7280", pro: "#8b5cf6", agency: "#06b6d4" };
const PLAN_PRICE = { free: 0, pro: 49, agency: 149 };

function KpiCard({ icon: Icon, label, value, sub, color = "purple" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    red: "from-red-500/20 to-red-600/10 border-red-500/30",
  };
  const iconColorMap: Record<string, string> = {
    purple: "text-violet-400", cyan: "text-cyan-400", green: "text-emerald-400",
    orange: "text-orange-400", blue: "text-blue-400", red: "text-red-400",
  };
  return (
    <Card className={`bg-gradient-to-br ${colorMap[color] ?? colorMap.purple} border`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className={`w-6 h-6 ${iconColorMap[color] ?? iconColorMap.purple}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    pro: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    agency: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[plan] ?? styles.free}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading, refetch } = trpc.admin.getOverview.useQuery();

  if (isLoading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading metrics...</div>;
  if (!data) return null;

  const planChartData = [
    { name: "Free", value: data.planCounts.free, color: PLAN_COLORS.free },
    { name: "Pro", value: data.planCounts.pro, color: PLAN_COLORS.pro },
    { name: "Agency", value: data.planCounts.agency, color: PLAN_COLORS.agency },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Business Overview</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="MRR" value={`$${data.mrr.toLocaleString()}`} sub={`ARR: $${data.arr.toLocaleString()}`} color="green" />
        <KpiCard icon={Users} label="Total Users" value={data.totalUsers.toLocaleString()} sub={`+${data.newUsers7d} this week`} color="purple" />
        <KpiCard icon={Crown} label="Paid Subscribers" value={data.activePaidSubs} sub={`${data.canceledPaidSubs} canceled`} color="cyan" />
        <KpiCard icon={TrendingUp} label="New (30d)" value={data.newUsers30d} sub={`${data.totalCampaigns} campaigns total`} color="blue" />
        <KpiCard icon={Activity} label="Engagements" value={data.totalEngagements.toLocaleString()} sub={`${data.approvedEngagements} approved`} color="orange" />
        <KpiCard icon={Zap} label="Accounts" value={data.totalAccounts} sub="Connected social accounts" color="purple" />
        <KpiCard icon={BarChart2} label="Campaigns" value={data.totalCampaigns} sub="All time" color="cyan" />
        <KpiCard icon={Shield} label="Churn" value={data.canceledPaidSubs > 0 ? `${Math.round((data.canceledPaidSubs / (data.activePaidSubs + data.canceledPaidSubs)) * 100)}%` : "0%"} sub="Canceled / total paid" color="red" />
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" /> Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={planChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {planChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "users"]} contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {planChartData.map(p => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm text-muted-foreground">{p.name}</span>
                    <span className="text-sm font-semibold text-foreground ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Free tier", count: data.planCounts.free, rev: 0 },
              { label: "Pro ($49/mo)", count: data.planCounts.pro, rev: data.planCounts.pro * 49 },
              { label: "Agency ($149/mo)", count: data.planCounts.agency, rev: data.planCounts.agency * 149 },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{row.count} users</span>
                  <span className="text-sm font-semibold text-foreground">${row.rev.toLocaleString()}/mo</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold text-foreground">Total MRR</span>
              <span className="text-lg font-bold text-emerald-400">${data.mrr.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Customers Tab ───────────────────────────────────────────────────────────
function CustomersTab({ onSelectUser }: { onSelectUser: (id: number) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState("joined");

  const { data, isLoading } = trpc.admin.getUsers.useQuery({ page, limit: 25, search });
  const updatePlan = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => toast.success("Plan updated"),
    onError: () => toast.error("Failed to update plan"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="pl-9 bg-background/50"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
        {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>Clear</Button>}
        <span className="text-sm text-muted-foreground ml-auto">{data?.total ?? 0} users</span>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Accounts</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Campaigns</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Joined</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border/30">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : data?.users.map(user => (
              <tr key={user.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email ?? user.openId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={user.subscription?.plan ?? "free"} />
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{user.accountCount}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{user.campaignCount}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onSelectUser(user.id)} className="h-7 px-2 text-xs gap-1">
                      <Eye className="w-3 h-3" /> View
                    </Button>
                    <Select
                      value={user.subscription?.plan ?? "free"}
                      onValueChange={plan => updatePlan.mutate({ userId: user.id, plan: plan as "free" | "pro" | "agency" })}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ─── Revenue Tab ─────────────────────────────────────────────────────────────
function RevenueTab() {
  const { data, isLoading } = trpc.admin.getRevenueMetrics.useQuery();

  if (isLoading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading revenue data...</div>;
  if (!data) return null;

  const planPieData = [
    { name: "Free", value: data.planDistribution.free, color: PLAN_COLORS.free },
    { name: "Pro", value: data.planDistribution.pro, color: PLAN_COLORS.pro },
    { name: "Agency", value: data.planDistribution.agency, color: PLAN_COLORS.agency },
  ];

  return (
    <div className="space-y-6">
      {/* Daily Revenue Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> New Revenue (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No revenue data yet — first paid subscription will appear here
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => [`$${v}`, "Revenue"]} contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution Pie */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" /> Active Subscribers by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={planPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {planPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #333" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {planPieData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-xs text-muted-foreground">{p.name}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers by LTV */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="w-4 h-4" /> Top Customers by LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">No paid customers yet</div>
            ) : (
              <div className="space-y-2">
                {data.topCustomers.slice(0, 6).map((c, i) => (
                  <div key={c.userId} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <PlanBadge plan={c.plan} />
                    <span className="text-sm font-bold text-emerald-400">${c.ltv}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Support Tab ─────────────────────────────────────────────────────────────
function SupportTab() {
  const { data, isLoading } = trpc.admin.getSupportActivity.useQuery({ limit: 20 });

  if (isLoading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading support activity...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Support Chat Sessions</h2>
        <span className="text-sm text-muted-foreground">{data?.length ?? 0} recent sessions</span>
      </div>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Last Message</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Messages</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {!data || data.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No support sessions yet</td></tr>
            ) : data.map(session => (
              <tr key={session.sessionId} className="border-t border-border/30 hover:bg-muted/10">
                <td className="px-4 py-3">
                  {session.userName ? (
                    <div>
                      <p className="font-medium text-foreground">{session.userName}</p>
                      <p className="text-xs text-muted-foreground">{session.userEmail}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">Anonymous visitor</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-muted-foreground text-xs truncate max-w-xs">{session.content}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-xs">{session.messageCount}</Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                  {new Date(session.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── System Tab ──────────────────────────────────────────────────────────────
function SystemTab() {
  const { data, isLoading, refetch } = trpc.admin.getSystemHealth.useQuery();

  if (isLoading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading system health...</div>;
  if (!data) return null;

  const tableRows = Object.entries(data.tables).map(([key, count]) => ({
    table: key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">System Health</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">Database</p>
              <p className="text-xs text-emerald-400 capitalize">{data.dbStatus}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-foreground">API Server</p>
              <p className="text-xs text-emerald-400">Running</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${data.tables.queuePending > 50 ? "bg-orange-500/10 border-orange-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {data.tables.queuePending > 50
              ? <AlertTriangle className="w-5 h-5 text-orange-400" />
              : <CheckCircle className="w-5 h-5 text-emerald-400" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Queue Backlog</p>
              <p className={`text-xs ${data.tables.queuePending > 50 ? "text-orange-400" : "text-emerald-400"}`}>
                {data.tables.queuePending} pending items
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DB Table Counts */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Server className="w-4 h-4" /> Database Table Counts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tableRows.map(row => (
              <div key={row.table} className="bg-muted/20 rounded-lg p-3 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">{row.table}</p>
                <p className="text-xl font-bold text-foreground">{row.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Last checked: {new Date(data.timestamp).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.admin.getUserDetail.useQuery({ userId });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-background border-l border-border/50 overflow-y-auto">
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">User Detail</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : !data ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">User not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold">
                {(data.user.name ?? data.user.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{data.user.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{data.user.email ?? data.user.openId}</p>
                <div className="flex items-center gap-2 mt-1">
                  <PlanBadge plan={data.subscription?.plan ?? "free"} />
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(data.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscription */}
            {data.subscription && (
              <Card className="bg-muted/20 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Subscription</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><PlanBadge plan={data.subscription.plan} /></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground capitalize">{data.subscription.status}</span></div>
                  {data.subscription.currentPeriodEnd && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Renews</span><span className="text-foreground">{new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}</span></div>
                  )}
                  {data.subscription.stripeCustomerId && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Stripe ID</span><span className="text-foreground text-xs font-mono">{data.subscription.stripeCustomerId}</span></div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-muted/20 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.accounts.length}</p>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/20 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.campaigns.length}</p>
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/20 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.queueStats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/20 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{data.queueStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
            </div>

            {/* Connected Accounts */}
            {data.accounts.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Connected Accounts</p>
                <div className="space-y-2">
                  {data.accounts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground capitalize w-16">{a.platform}</span>
                      <span className="text-sm text-foreground">@{a.handle}</span>
                      <span className={`ml-auto text-xs ${a.isActive ? "text-emerald-400" : "text-red-400"}`}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Support */}
            {data.supportSessions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Recent Support Messages</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.supportSessions.map(msg => (
                    <div key={msg.id} className={`text-xs p-2 rounded ${msg.role === "user" ? "bg-violet-500/10 text-violet-300" : "bg-muted/20 text-muted-foreground"}`}>
                      <span className="font-medium capitalize">{msg.role}: </span>{msg.content.slice(0, 120)}{msg.content.length > 120 ? "..." : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "system", label: "System", icon: Server },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Redirect non-admins
  if (!authLoading && (!user || (user as { role?: string }).role !== "admin")) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Social Growth Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">Logged in as {user?.name ?? user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="text-xs">
              Back to App
            </Button>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-violet-500 text-violet-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "customers" && <CustomersTab onSelectUser={setSelectedUserId} />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "support" && <SupportTab />}
        {activeTab === "system" && <SystemTab />}
      </div>

      {/* User Detail Drawer */}
      {selectedUserId !== null && (
        <UserDetailDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
