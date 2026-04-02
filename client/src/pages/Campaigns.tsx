import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Plus, Play, Pause, Trash2, Target, X, CheckCircle2, Crown, LayoutTemplate, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-blue-500/20 text-blue-400",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500/20 text-sky-400",
  reddit: "bg-orange-500/20 text-orange-400",
  linkedin: "bg-blue-500/20 text-blue-400",
  instagram: "bg-pink-500/20 text-pink-400",
  tiktok: "bg-purple-500/20 text-purple-400",
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export default function Campaigns() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      utils.analytics.summary.invalidate();
      toast.success("Campaign created!");
      setOpen(false);
      resetForm();
    },
    onError: (e) => {
      if (e.message.startsWith("PLAN_LIMIT:")) {
        const parts = e.message.split(":");
        const plan = parts[2] ?? "free";
        const limit = parts[3] ?? "1";
        toast.error(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan limit: ${limit} campaign${Number(limit) !== 1 ? "s" : ""}. Upgrade to create more.`, {
          action: { label: "Upgrade Now", onClick: () => navigate("/billing") },
          duration: 8000,
          icon: <Crown className="h-4 w-4 text-primary" />,
        });
      } else {
        toast.error(e.message);
      }
    },
  });
  const updateMutation = trpc.campaigns.update.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign updated"); },
  });
  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); utils.analytics.summary.invalidate(); toast.success("Campaign deleted"); },
  });

  const [open, setOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const { data: templates } = trpc.campaignTemplates.getTemplates.useQuery();

  function applyTemplate(t: NonNullable<typeof templates>[number]) {
    setForm({
      name: t.name,
      description: t.description,
      keywords: t.keywords,
      platforms: t.platforms,
      persona: t.persona,
      playbook: "direct_negotiator",
      targetEngagements: 50,
    });
    setKeywordInput("");
    setTemplateOpen(false);
    setOpen(true);
  }
  const [form, setForm] = useState({
    name: "",
    description: "",
    keywords: [] as string[],
    platforms: [] as string[],
    persona: "",
    playbook: "direct_negotiator" as "3_day_warmup" | "direct_negotiator",
    targetEngagements: 50,
  });

  function resetForm() {
    setForm({ name: "", description: "", keywords: [], platforms: [], persona: "", playbook: "direct_negotiator", targetEngagements: 50 });
    setKeywordInput("");
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) {
      setForm((f) => ({ ...f, keywords: [...f.keywords, kw] }));
    }
    setKeywordInput("");
  }

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  const canCreate = form.name && form.keywords.length > 0 && form.platforms.length > 0 && form.persona.length >= 10;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configure and manage your autonomous growth campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Template Picker Modal */}
          <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <LayoutTemplate className="h-4 w-4" />Use Template
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Campaign Templates</DialogTitle>
                <p className="text-sm text-muted-foreground">Choose a pre-built template to get started instantly</p>
              </DialogHeader>
              <div className="grid gap-3 pt-2">
                {(templates ?? []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="text-left p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{t.name}</span>
                          {t.id === "self-promotion" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">Recommended</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.keywords.slice(0, 4).map(k => (
                            <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{k}</span>
                          ))}
                          {t.keywords.length > 4 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{t.keywords.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">~{t.estimatedThreadsPerWeek} threads/wk</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Campaign</Button>
            </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-foreground">Campaign Name</Label>
                <Input className="bg-input border-border text-foreground placeholder:text-muted-foreground" placeholder="e.g. SaaS Founder Outreach" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Description (optional)</Label>
                <Input className="bg-input border-border text-foreground placeholder:text-muted-foreground" placeholder="Brief description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Target Keywords</Label>
                <div className="flex gap-2">
                  <Input className="bg-input border-border text-foreground placeholder:text-muted-foreground" placeholder="Add keyword..." value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                  <Button variant="outline" size="sm" onClick={addKeyword} className="shrink-0">Add</Button>
                </div>
                {form.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.keywords.map((kw) => (
                      <span key={kw} className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {kw}
                        <button onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }))}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Platforms</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["twitter", "reddit", "linkedin", "instagram", "tiktok"].map((p) => (
                    <button key={p} onClick={() => togglePlatform(p)} className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${form.platforms.includes(p) ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"}`}>
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Engagement Persona</Label>
                <Textarea className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none" rows={3} placeholder="Describe how the AI should engage. e.g. 'Act as a helpful SaaS consultant who shares practical advice without being salesy. Focus on solving problems first.'" value={form.persona} onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Playbook</Label>
                  <Select value={form.playbook} onValueChange={(v) => setForm((f) => ({ ...f, playbook: v as "3_day_warmup" | "direct_negotiator" }))}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="direct_negotiator">Direct Negotiator</SelectItem>
                      <SelectItem value="3_day_warmup">3-Day Warmup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Target Engagements</Label>
                  <Input type="number" className="bg-input border-border text-foreground" value={form.targetEngagements} onChange={(e) => setForm((f) => ({ ...f, targetEngagements: parseInt(e.target.value) || 50 }))} />
                </div>
              </div>
              <Button className="w-full" disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate({ ...form, platforms: form.platforms as ("twitter" | "reddit" | "linkedin" | "instagram" | "tiktok")[] })}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Card key={i} className="bg-card border-border animate-pulse"><CardContent className="p-5 h-36" /></Card>)}
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Create your first campaign to start discovering and engaging with high-intent conversations.</p>
            <Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create First Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="bg-card border-border hover:border-primary/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{c.playbook.replace("_", " ")}</span>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {c.status === "draft" || c.status === "paused" ? (
                      <Button size="sm" className="gap-1.5" onClick={() => updateMutation.mutate({ id: c.id, status: "active" })}>
                        <Play className="h-3.5 w-3.5" />Start
                      </Button>
                    ) : c.status === "active" ? (
                      <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => updateMutation.mutate({ id: c.id, status: "paused" })}>
                        <Pause className="h-3.5 w-3.5" />Pause
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate({ id: c.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(c.keywords as string[]).map((kw) => (
                    <span key={kw} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {(c.platforms as string[]).map((p) => (
                    <span key={p} className={`text-xs px-2 py-0.5 rounded-md font-medium ${PLATFORM_COLORS[p] ?? "bg-muted text-muted-foreground"}`}>{PLATFORM_LABELS[p] ?? p}</span>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Discovered", value: c.totalDiscovered ?? 0, icon: Target },
                    { label: "Engaged", value: c.totalEngaged ?? 0, icon: CheckCircle2 },
                    { label: "Approved", value: c.totalApproved ?? 0, icon: CheckCircle2 },
                    { label: "Target", value: c.targetEngagements ?? 0, icon: Target },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/40">
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
