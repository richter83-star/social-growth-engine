/**
 * OnboardingWizard
 *
 * 3-step modal that fires on first login:
 * Step 1 — Business profile (industry, platforms, goal)
 * Step 2 — AI-generated campaign preview (editable)
 * Step 3 — First discovery results + approve first draft
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Zap, ChevronRight, ChevronLeft, Check, Loader2,
  Twitter, Linkedin, Instagram, Target, Users, TrendingUp, Briefcase,
} from "lucide-react";

const INDUSTRIES = [
  "Social Media Marketing", "Digital Marketing Agency", "E-commerce / Retail",
  "B2B SaaS / Software", "Consulting / Coaching", "Real Estate",
  "Finance / Fintech", "Health & Wellness", "Food & Beverage",
  "Travel & Hospitality", "Education / EdTech", "Legal Services",
  "Recruiting / HR", "Non-profit", "Creator / Influencer",
  "Fashion / Beauty", "Gaming / Entertainment", "Crypto / Web3",
  "Manufacturing / B2B", "Other",
];

const PLATFORMS = [
  { id: "twitter", label: "Twitter / X", icon: Twitter, color: "text-sky-400" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-500" },
  { id: "reddit", label: "Reddit", icon: () => <span className="text-orange-400 font-bold text-sm">r/</span>, color: "text-orange-400" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
];

const GOALS = [
  { id: "followers", label: "Grow Followers", desc: "Build a large, engaged audience", icon: Users },
  { id: "leads", label: "Generate Leads", desc: "Drive inbound inquiries and signups", icon: Target },
  { id: "brand_awareness", label: "Brand Awareness", desc: "Increase visibility and thought leadership", icon: TrendingUp },
  { id: "client_acquisition", label: "Acquire Clients", desc: "Find and convert potential clients", icon: Briefcase },
];

type Step = 1 | 2 | 3;

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [industry, setIndustry] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter"]);
  const [goal, setGoal] = useState("leads");
  const [businessName, setBusinessName] = useState("");

  // Step 2 state (AI-generated, editable)
  const [campaignName, setCampaignName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [persona, setPersona] = useState("");
  const [keywordsText, setKeywordsText] = useState("");

  // Step 3 state
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [referralCode, setReferralCode] = useState("");

  const generateConfig = trpc.onboarding.generateCampaignConfig.useMutation();
  const complete = trpc.onboarding.complete.useMutation();
  const skip = trpc.onboarding.skip.useMutation();
  const utils = trpc.useUtils();

  const togglePlatform = (id: string) => {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleStep1Next = async () => {
    if (!industry) {
      toast.error("Please select your industry");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    try {
      const config = await generateConfig.mutateAsync({
        industry,
        platforms: platforms as any,
        goal: goal as any,
        businessName: businessName || undefined,
      });
      setCampaignName(config.campaignName);
      setKeywords(config.keywords);
      setKeywordsText(config.keywords.join(", "));
      setPersona(config.persona);
      setStep(2);
    } catch {
      toast.error("Failed to generate campaign config. Please try again.");
    }
  };

  const handleStep2Next = async () => {
    const parsedKeywords = keywordsText
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    if (!campaignName || parsedKeywords.length === 0) {
      toast.error("Campaign name and keywords are required");
      return;
    }

    try {
      const result = await complete.mutateAsync({
        industry,
        platforms: platforms as any,
        goal: goal as any,
        businessName: businessName || undefined,
        campaignName,
        keywords: parsedKeywords,
        persona,
        runDiscovery: true,
      });

      setDiscoveredCount(result.discoveredCount);
      setReferralCode(result.referralCode);
      await utils.campaigns.invalidate();
      await utils.discovery.invalidate();
      setStep(3);
    } catch {
      toast.error("Setup failed. Please try again.");
    }
  };

  const handleSkip = async () => {
    try {
      await skip.mutateAsync();
      onComplete();
    } catch {
      onComplete(); // skip regardless
    }
  };

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden bg-card border-border"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Zap className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Step {step} of 3
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSkip}
              disabled={skip.isPending}
            >
              Skip setup
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step 1: Business Profile */}
        {step === 1 && (
          <div className="px-8 pb-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome to Growth Engine</h2>
              <p className="text-muted-foreground mt-1">
                Tell us about your business so we can configure your first campaign automatically.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    placeholder="e.g. Acme Marketing"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry <span className="text-red-400">*</span></Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms to grow on <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    const selected = platforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-violet-500/60 bg-violet-500/10 text-foreground"
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <span className={p.color}><Icon className="h-4 w-4" /></span>
                        <span className="text-sm font-medium">{p.label}</span>
                        {selected && <Check className="h-3.5 w-3.5 ml-auto text-violet-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary goal</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map(g => {
                    const Icon = g.icon;
                    const selected = goal === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-cyan-500/60 bg-cyan-500/10"
                            : "border-border/50 bg-muted/20 hover:border-border"
                        }`}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 ${selected ? "text-cyan-400" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>{g.label}</p>
                          <p className="text-xs text-muted-foreground">{g.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleStep1Next}
                disabled={generateConfig.isPending || !industry || platforms.length === 0}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white gap-2"
              >
                {generateConfig.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating your campaign…</>
                ) : (
                  <>Generate Campaign <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: AI-Generated Campaign Preview */}
        {step === 2 && (
          <div className="px-8 pb-8 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Campaign is Ready</h2>
              <p className="text-muted-foreground mt-1">
                AI generated this based on your profile. Review and edit anything before we launch.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign name</Label>
                <Input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="bg-muted/30 font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label>Target keywords <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Textarea
                  value={keywordsText}
                  onChange={e => setKeywordsText(e.target.value)}
                  rows={3}
                  className="bg-muted/30 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {keywordsText.split(",").filter(k => k.trim()).length} keywords
                </p>
              </div>

              <div className="space-y-2">
                <Label>AI engagement persona</Label>
                <Textarea
                  value={persona}
                  onChange={e => setPersona(e.target.value)}
                  rows={2}
                  className="bg-muted/30 text-sm resize-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-violet-300">
                  <span className="font-semibold">Platforms:</span>{" "}
                  {platforms.map(p => PLATFORMS.find(pl => pl.id === p)?.label).join(", ")}
                  {" · "}
                  <span className="font-semibold">Goal:</span>{" "}
                  {GOALS.find(g => g.id === goal)?.label}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-1 text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleStep2Next}
                disabled={complete.isPending}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white gap-2"
              >
                {complete.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Launching campaign…</>
                ) : (
                  <>Launch & Discover <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: First Discovery Results */}
        {step === 3 && (
          <div className="px-8 pb-8 space-y-6">
            <div className="text-center pt-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center mx-auto mb-4 border border-violet-500/30">
                <Check className="h-8 w-8 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">You're all set!</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your campaign is live and Growth Engine discovered{" "}
                <span className="text-cyan-400 font-semibold">{discoveredCount} threads</span>{" "}
                in your first scan. Head to the Engagement Queue to review your first AI-drafted replies.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-2xl font-bold text-violet-400">1</p>
                <p className="text-xs text-muted-foreground mt-1">Campaign created</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-2xl font-bold text-cyan-400">{discoveredCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Threads discovered</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-2xl font-bold text-emerald-400">∞</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to grow</p>
              </div>
            </div>

            {referralCode && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
                <p className="text-sm font-semibold text-foreground mb-1">Your referral code</p>
                <div className="flex items-center gap-3">
                  <code className="text-lg font-mono font-bold text-cyan-400 tracking-widest">
                    {referralCode}
                  </code>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">
                    1 month free per referral
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with anyone — when they subscribe, you get a free month.
                </p>
              </div>
            )}

            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white gap-2"
            >
              Go to Dashboard <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
