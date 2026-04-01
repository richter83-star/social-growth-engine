import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Search,
  Users,
  Megaphone,
  Zap,
  MessageSquare,
  Calendar,
  CreditCard,
  Shield,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  HelpCircle,
} from "lucide-react";

// ─── User Guide Data ──────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    id: "accounts",
    icon: Users,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    title: "Connecting Social Accounts",
    description: "Link your Twitter, Reddit, LinkedIn, Instagram, and TikTok profiles to enable monitoring and engagement.",
    steps: [
      {
        step: 1,
        title: "Open the Accounts page",
        detail: "Click Accounts in the left sidebar. This page shows all your connected social profiles and their live metrics.",
      },
      {
        step: 2,
        title: "Click Add Account",
        detail: "Select your platform from the dropdown — Twitter, Reddit, LinkedIn, Instagram, or TikTok. Each platform has a unique color and icon.",
      },
      {
        step: 3,
        title: "Enter your handle",
        detail: "Type your username (without the @ symbol). Optionally add a display name. Your credentials are stored encrypted and used only for monitoring.",
      },
      {
        step: 4,
        title: "Toggle accounts on/off",
        detail: "Use the toggle switch on each account card to pause monitoring without deleting the account. Metrics are preserved.",
      },
    ],
    tip: "Connect at least one account per platform you plan to run campaigns on. The engine uses your account context to tailor comment style and tone.",
  },
  {
    id: "campaigns",
    icon: Megaphone,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Creating Campaigns",
    description: "Campaigns define what conversations to find and how to engage with them. Each campaign has keywords, platforms, and an AI persona.",
    steps: [
      {
        step: 1,
        title: "Click New Campaign",
        detail: "On the Campaigns page, click the New Campaign button. A dialog will open with all configuration options.",
      },
      {
        step: 2,
        title: "Set target keywords",
        detail: "Add keywords that signal high-intent conversations. Type a keyword and press Enter or click Add. Examples: 'looking for CRM', 'best email tool', 'startup advice'.",
      },
      {
        step: 3,
        title: "Select platforms",
        detail: "Choose one or more platforms to monitor. You can select all five at once. Each platform's discovery is tuned to its content format.",
      },
      {
        step: 4,
        title: "Write your engagement persona",
        detail: "Describe how the AI should engage. Be specific: 'Act as a helpful SaaS growth consultant. Share practical advice without being salesy. Lead with value, mention our tool only when directly relevant.'",
      },
      {
        step: 5,
        title: "Choose a playbook",
        detail: "Direct Negotiator: engages immediately with a strong value proposition. 3-Day Warmup: builds rapport over multiple touchpoints before pitching.",
      },
      {
        step: 6,
        title: "Activate the campaign",
        detail: "Click Start on the campaign card. Only active campaigns can be used for discovery runs and schedules.",
      },
    ],
    tip: "The more specific your persona description, the better the AI comments. Include your niche, tone, and what topics to avoid.",
  },
  {
    id: "discovery",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Running Thread Discovery",
    description: "The discovery engine scans platforms for conversations matching your campaign keywords and scores them by intent and engagement potential.",
    steps: [
      {
        step: 1,
        title: "Go to Discovery",
        detail: "Click Discovery in the sidebar. You will see a campaign selector and the Run Discovery button.",
      },
      {
        step: 2,
        title: "Select an active campaign",
        detail: "Choose the campaign you want to run discovery for. Only active campaigns appear in the dropdown.",
      },
      {
        step: 3,
        title: "Click Run Discovery",
        detail: "The AI swarm scans your target platforms for threads matching your keywords. This takes 10–30 seconds depending on the number of platforms.",
      },
      {
        step: 4,
        title: "Review discovered threads",
        detail: "Each thread shows an Intent Score (how likely the author needs your help) and Engagement Potential (how much traction your reply could get). High Intent threads are flagged in green.",
      },
      {
        step: 5,
        title: "Generate AI comments",
        detail: "Click Generate Comment on any new thread to queue an AI-drafted reply. The comment is added to the Engagement Queue for your review.",
      },
    ],
    tip: "Focus on threads with Intent Score above 85% — these are the highest-value conversations where your engagement will have the most impact.",
  },
  {
    id: "queue",
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Managing the Engagement Queue",
    description: "Every AI-generated comment lands in the queue first. You review, edit, approve, or reject before anything is posted.",
    steps: [
      {
        step: 1,
        title: "Open Engagement Queue",
        detail: "Click Engagement Queue in the sidebar. Use the filter tabs (Pending / Approved / Rejected / Posted / All) to focus on what needs attention.",
      },
      {
        step: 2,
        title: "Read the AI draft",
        detail: "Each card shows the thread title, platform, and the AI-generated comment. The original AI draft is always preserved below the editor.",
      },
      {
        step: 3,
        title: "Edit if needed",
        detail: "Click the pencil icon or anywhere on the comment text to open the inline editor. A character counter warns you when approaching platform limits (e.g. 280 chars for Twitter).",
      },
      {
        step: 4,
        title: "Approve or reject",
        detail: "Click Approve to mark the comment ready for posting. Click Reject to discard it. Approved comments show a green badge; rejected ones show red.",
      },
      {
        step: 5,
        title: "Bulk approve",
        detail: "Use the Approve All Pending button to approve all pending comments at once — useful after a large discovery run.",
      },
    ],
    tip: "Comments marked as Edited show an orange badge so you can track which ones you personalised. The Restore Original button reverts to the AI draft at any time.",
  },
  {
    id: "schedules",
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "Automating with Schedules",
    description: "Schedules let the engine run discovery automatically on a recurring basis — fully hands-off after initial setup.",
    steps: [
      {
        step: 1,
        title: "Go to Schedules",
        detail: "Click Schedules in the sidebar. This page lists all your scheduled discovery jobs and their next run times.",
      },
      {
        step: 2,
        title: "Create a schedule",
        detail: "Click New Schedule. Choose the campaign, give the schedule a name, and pick a frequency preset: Daily at 9am, Twice Daily, Weekdays Only, or Weekly.",
      },
      {
        step: 3,
        title: "Activate the schedule",
        detail: "Toggle the schedule on. The engine will fire automatically at the next scheduled time and add discovered threads to your queue.",
      },
      {
        step: 4,
        title: "Monitor run history",
        detail: "Each schedule card shows the last run time, next run time, and total run count. You receive a notification each time a scheduled run completes.",
      },
      {
        step: 5,
        title: "Run manually",
        detail: "Click the Run Now button to trigger a discovery run immediately, outside the schedule. Useful for testing or catching up after a pause.",
      },
    ],
    tip: "Running discovery twice daily (9am and 5pm) captures both morning and end-of-day conversations when engagement is highest.",
  },
  {
    id: "billing",
    icon: CreditCard,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Plans & Billing",
    description: "Choose the plan that fits your growth goals. Upgrade at any time — your data is preserved.",
    steps: [
      {
        step: 1,
        title: "View your current plan",
        detail: "Your active plan is shown in the sidebar footer and on the Billing page. Free plan includes 1 campaign and 50 threads per month.",
      },
      {
        step: 2,
        title: "Upgrade to Pro or Agency",
        detail: "Go to Billing and click Upgrade on the Pro ($49/mo) or Agency ($149/mo) card. You will be redirected to Stripe's secure checkout.",
      },
      {
        step: 3,
        title: "Test with a card",
        detail: "Use card number 4242 4242 4242 4242 with any future expiry and any CVC to test the checkout flow in sandbox mode.",
      },
      {
        step: 4,
        title: "Manage your subscription",
        detail: "Click Manage Billing on the Billing page to access the Stripe portal where you can update payment methods, view invoices, or cancel.",
      },
    ],
    tip: "Agency plan is the best value if you manage multiple brands — unlimited campaigns and no thread discovery limits.",
  },
  {
    id: "team",
    icon: Shield,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Team & Permissions",
    description: "Invite collaborators and control exactly what each person can do in the Engagement Queue.",
    steps: [
      {
        step: 1,
        title: "Go to Team",
        detail: "Click Team in the sidebar. You will see all current members and their roles.",
      },
      {
        step: 2,
        title: "Invite a member",
        detail: "Click Invite Member, enter their email address, and choose a role preset: Editor, Reviewer, or Viewer.",
      },
      {
        step: 3,
        title: "Understand the roles",
        detail: "Owner: full access. Editor: can edit comments and run discovery. Reviewer: can approve/reject only. Viewer: read-only access.",
      },
      {
        step: 4,
        title: "Customise permissions",
        detail: "Toggle individual permissions (Edit, Approve, Reject, Discover, Manage Campaigns) for fine-grained control beyond the preset roles.",
      },
      {
        step: 5,
        title: "Remove members",
        detail: "Click the trash icon on any member card to revoke their access immediately. Their past actions are preserved in the audit log.",
      },
    ],
    tip: "Use the Reviewer role for clients or stakeholders who need to approve comments but should not be able to edit or create campaigns.",
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    q: "How do I start generating engagement immediately?",
    a: "Follow these four steps: (1) Connect at least one social account on the Accounts page. (2) Create a campaign with your target keywords and persona on the Campaigns page. (3) Activate the campaign. (4) Go to Discovery, select your campaign, and click Run Discovery. AI-generated comments will appear in the Engagement Queue within 30 seconds.",
  },
  {
    category: "Getting Started",
    q: "Do I need to provide API keys for Twitter, Instagram, or TikTok?",
    a: "No. The Growth Engine uses an AI-powered simulation layer (backed by the SocialMonitorService and StealthBrowser modules from your core system) to discover and analyse threads. You do not need to connect official API credentials to start. Simply enter your handle so the AI can tailor the comment style to your profile.",
  },
  {
    category: "Getting Started",
    q: "What is an engagement persona and how specific should it be?",
    a: "The persona is a natural-language description of how the AI should present itself when engaging. The more specific, the better. Include: your niche (e.g. 'B2B SaaS growth'), your tone (e.g. 'practical, not salesy'), what to lead with (e.g. 'always start with a question or insight'), and what to avoid (e.g. 'never mention pricing unprompted'). A good persona is 2–4 sentences.",
  },
  {
    category: "Campaigns",
    q: "How many campaigns can I run at once?",
    a: "Free plan: 1 active campaign. Pro plan: up to 5 active campaigns. Agency plan: unlimited campaigns. You can create more campaigns than your limit allows — only the number of active campaigns is gated.",
  },
  {
    category: "Campaigns",
    q: "What is the difference between the Direct Negotiator and 3-Day Warmup playbooks?",
    a: "Direct Negotiator engages immediately with a clear value proposition — best for high-intent threads where the person is actively looking for a solution. 3-Day Warmup builds rapport over multiple interactions before introducing your offering — better for cold audiences or communities that are sensitive to direct pitching (e.g. Reddit).",
  },
  {
    category: "Campaigns",
    q: "Can I target the same keywords on multiple platforms simultaneously?",
    a: "Yes. When creating a campaign, select all the platforms you want. The discovery engine runs across all selected platforms in a single run and returns threads from each. You can then filter by platform in the Discovery page.",
  },
  {
    category: "Discovery",
    q: "What does the Intent Score mean?",
    a: "The Intent Score (0–100%) measures how likely the thread author is to benefit from your engagement. A score above 85% means the person is actively expressing a pain point, asking for recommendations, or showing clear purchase intent. Focus your engagement efforts on these high-intent threads for the best ROI.",
  },
  {
    category: "Discovery",
    q: "How many threads does a single discovery run find?",
    a: "Each run discovers approximately 8–12 threads by default. The AI selects the highest-intent conversations from a broader scan. Running discovery twice daily on an active campaign typically surfaces 15–25 actionable threads per day.",
  },
  {
    category: "Discovery",
    q: "Can I run discovery on multiple campaigns at the same time?",
    a: "Yes. You can trigger discovery runs on different campaigns independently. Use the Schedules page to automate each campaign on its own schedule so they run in parallel without manual intervention.",
  },
  {
    category: "Engagement Queue",
    q: "What happens after I approve a comment?",
    a: "Approved comments are marked as ready for posting. In the current version, posting is manual — you copy the approved comment and post it on the platform. A future update will add one-click posting via platform APIs. The queue tracks which comments have been posted so you never duplicate.",
  },
  {
    category: "Engagement Queue",
    q: "Can I regenerate a comment I do not like?",
    a: "Yes. Go to the Discovery page, find the thread, and click Generate Comment again. A new AI draft will be created and added to the queue. You can have multiple drafts for the same thread and approve the best one.",
  },
  {
    category: "Engagement Queue",
    q: "What is the character limit for comments?",
    a: "The inline editor shows a live character counter. Twitter/X has a 280-character limit (the counter turns red when you exceed it). Reddit, LinkedIn, Instagram, and TikTok have much higher limits. The AI is trained to respect platform norms by default.",
  },
  {
    category: "Schedules",
    q: "What happens if a scheduled run fails?",
    a: "If a discovery run encounters an error (e.g. a temporary API issue), the schedule logs the failure and retries at the next scheduled interval. You will receive a notification if a run fails. The run count only increments on successful completions.",
  },
  {
    category: "Schedules",
    q: "Can I set a custom cron expression instead of a preset?",
    a: "Yes. When creating a schedule, select Custom Cron from the frequency dropdown and enter a standard 5-field cron expression (e.g. '0 8,17 * * 1-5' for weekdays at 8am and 5pm). The schedule preview shows the next 3 run times so you can verify the expression.",
  },
  {
    category: "Billing",
    q: "Is there a free trial for Pro or Agency?",
    a: "The Free plan is permanently free with no credit card required. There is no time-limited trial for paid plans — you can upgrade and downgrade at any time. If you downgrade, your data is preserved but features are gated to the lower plan's limits.",
  },
  {
    category: "Billing",
    q: "How do I cancel my subscription?",
    a: "Go to Billing and click Manage Billing. This opens the Stripe customer portal where you can cancel your subscription. Cancellation takes effect at the end of the current billing period. Your data remains accessible on the Free plan.",
  },
  {
    category: "Team & Permissions",
    q: "Can a team member see all campaigns, not just specific ones?",
    a: "Currently, team members with access can see all campaigns belonging to the account owner. Campaign-level permission scoping (restricting a member to specific campaigns) is planned for a future release.",
  },
  {
    category: "Team & Permissions",
    q: "What happens when I remove a team member?",
    a: "Their access is revoked immediately. Any comments they approved or edited remain in the queue with their action recorded. They cannot log back in with the same invitation link.",
  },
];

const FAQ_CATEGORIES = ["All", ...Array.from(new Set(FAQ_ITEMS.map((f) => f.category)))];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Help() {
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState("All");

  const filteredFaq = FAQ_ITEMS.filter((item) => {
    const matchesCategory = faqCategory === "All" || item.category === faqCategory;
    const matchesSearch =
      !faqSearch ||
      item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Help Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you need to get the most out of the Social Growth Engine
        </p>
      </div>

      <Tabs defaultValue="guide">
        <TabsList className="bg-muted/40 border border-border">
          <TabsTrigger value="guide" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpen className="h-4 w-4" />
            User Guide
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        {/* ── USER GUIDE TAB ── */}
        <TabsContent value="guide" className="mt-6 space-y-4">
          {/* Quick Start Banner */}
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Quick Start — 4 steps to your first engagement</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {["Connect Account", "Create Campaign", "Run Discovery", "Approve Comments"].map((step, i) => (
                      <div key={step} className="flex items-center gap-1.5">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm text-foreground">{step}</span>
                        {i < 3 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guide Sections */}
          <Accordion type="multiple" className="space-y-3">
            {GUIDE_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="bg-card border border-border rounded-xl px-0 overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/20 transition-colors [&[data-state=open]]:bg-muted/20">
                    <div className="flex items-center gap-3 text-left">
                      <div className={`p-2 rounded-lg ${section.bg}`}>
                        <Icon className={`h-4 w-4 ${section.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{section.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-normal">{section.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="space-y-3 mt-2">
                      {section.steps.map((s) => (
                        <div key={s.step} className="flex gap-3">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                            {s.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.detail}</p>
                          </div>
                        </div>
                      ))}
                      {/* Pro tip */}
                      <div className="flex gap-2 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300 leading-relaxed"><span className="font-semibold">Pro tip:</span> {section.tip}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        {/* ── FAQ TAB ── */}
        <TabsContent value="faq" className="mt-6 space-y-4">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
                placeholder="Search questions..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFaqCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    faqCategory === cat
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground">
            {filteredFaq.length} question{filteredFaq.length !== 1 ? "s" : ""} {faqSearch || faqCategory !== "All" ? "found" : "total"}
          </p>

          {filteredFaq.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No matching questions</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different search term or category.</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredFaq.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="bg-card border border-border rounded-xl px-0 overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/20 transition-colors [&[data-state=open]]:bg-muted/20 text-left">
                    <div className="flex items-start gap-3 pr-2">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground mb-1.5 font-normal">
                          {item.category}
                        </Badge>
                        <p className="text-sm font-medium text-foreground leading-snug">{item.q}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="pl-7">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
