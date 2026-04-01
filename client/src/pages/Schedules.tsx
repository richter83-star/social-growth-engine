import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Clock, Plus, Play, Trash2, Calendar, Zap, RefreshCw } from "lucide-react";

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Daily at 8am", value: "0 8 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Daily at noon", value: "0 12 * * *" },
  { label: "Weekdays at 9am", value: "0 9 * * 1-5" },
  { label: "Mon/Wed/Fri at 8am", value: "0 8 * * 1,3,5" },
  { label: "Custom", value: "custom" },
];

function describeCron(expr: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === expr);
  return preset ? preset.label : expr;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "Never";
  return new Date(d).toLocaleString();
}

export default function Schedules() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [cronPreset, setCronPreset] = useState("0 9 * * *");
  const [customCron, setCustomCron] = useState("");

  const utils = trpc.useUtils();
  const { data: schedules = [], isLoading } = trpc.schedules.list.useQuery();
  const { data: campaigns = [] } = trpc.campaigns.list.useQuery();

  const createSchedule = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created — discovery will run automatically.");
      utils.schedules.list.invalidate();
      setOpen(false);
      setName("");
      setCampaignId("");
      setCronPreset("0 9 * * *");
      setCustomCron("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSchedule = trpc.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated.");
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSchedule = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted.");
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const runNow = trpc.schedules.runNow.useMutation({
    onSuccess: (data) => {
      const count = (data as { discovered?: number })?.discovered ?? 0;
      toast.success(`Manual run complete — ${count} threads discovered.`);
      utils.schedules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const effectiveCron = cronPreset === "custom" ? customCron : cronPreset;

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Please enter a schedule name.");
    if (!campaignId) return toast.error("Please select a campaign.");
    if (!effectiveCron.trim()) return toast.error("Please select or enter a cron expression.");
    createSchedule.mutate({
      name: name.trim(),
      campaignId: parseInt(campaignId),
      cronExpression: effectiveCron.trim(),
      timezone: "UTC",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Schedules
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate discovery runs — set it once and let the engine work hands-free.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Automated Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Schedule Name</Label>
                  <Input
                    placeholder="e.g. Daily Morning Scan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Campaign</Label>
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an active campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCampaigns.length === 0 ? (
                        <SelectItem value="none" disabled>No active campaigns</SelectItem>
                      ) : (
                        activeCampaigns.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {activeCampaigns.length === 0 && (
                    <p className="text-xs text-amber-500">Activate a campaign first to schedule it.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select value={cronPreset} onValueChange={setCronPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cronPreset === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Custom Cron Expression</Label>
                    <Input
                      placeholder="e.g. 0 9 * * 1-5"
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: minute hour day month weekday (5 fields)
                    </p>
                  </div>
                )}
                {cronPreset !== "custom" && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">
                    {cronPreset}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createSchedule.isPending}
                >
                  {createSchedule.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Schedules", value: schedules.length, icon: Calendar },
            { label: "Active", value: schedules.filter((s) => s.isActive).length, icon: Zap },
            { label: "Total Runs", value: schedules.reduce((a, s) => a + (s.runCount ?? 0), 0), icon: RefreshCw },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="bg-card border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Schedules list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No schedules yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create a schedule to automate discovery runs for your campaigns.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const campaign = campaigns.find((c) => c.id === schedule.campaignId);
              return (
                <Card key={schedule.id} className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${schedule.isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                          <Clock className={`h-5 w-5 ${schedule.isActive ? "text-emerald-400" : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{schedule.name}</h3>
                            <Badge variant={schedule.isActive ? "default" : "secondary"} className="text-xs shrink-0">
                              {schedule.isActive ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {describeCron(schedule.cronExpression)}
                            </span>
                            {campaign && (
                              <span className="text-xs text-muted-foreground">
                                Campaign: <span className="text-foreground">{campaign.name}</span>
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Runs: <span className="text-foreground">{schedule.runCount ?? 0}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Last run: {formatDate(schedule.lastRunAt)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Next run: {schedule.isActive ? formatDate(schedule.nextRunAt) : "Paused"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(checked) =>
                            updateSchedule.mutate({ id: schedule.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={runNow.isPending}
                          onClick={() =>
                            runNow.mutate({ id: schedule.id, campaignId: schedule.campaignId })
                          }
                        >
                          <Play className="h-3.5 w-3.5" />
                          Run Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSchedule.mutate({ id: schedule.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Scheduling Works</CardTitle>
            <CardDescription>The autonomous discovery loop explained</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Schedule fires", desc: "The cron engine triggers at your set time and wakes the discovery system." },
                { step: "2", title: "Threads discovered", desc: "The AI swarm scans Twitter, Reddit, and LinkedIn for high-intent conversations matching your keywords." },
                { step: "3", title: "Queue populated", desc: "New threads are saved and AI-generated comments appear in your Engagement Queue for review." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
