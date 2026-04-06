import { useState } from "react";
import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  Check,
  X,
  Zap,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "free",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for individuals testing the waters.",
    icon: <Zap className="w-5 h-5" />,
    color: "from-slate-500 to-slate-600",
    badge: null,
    cta: "Get Started Free",
    features: [
      "1 active campaign",
      "50 thread discoveries / month",
      "2 connected accounts",
      "AI comment generation",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "For creators and founders serious about growth.",
    icon: <Star className="w-5 h-5" />,
    color: "from-violet-600 to-cyan-600",
    badge: "Most Popular",
    cta: "Start Pro Free Trial",
    features: [
      "5 active campaigns",
      "Unlimited thread discoveries",
      "10 connected accounts",
      "AI comment generation & editing",
      "Advanced analytics + follower chart",
      "Campaign scheduling (5 schedules/campaign)",
      "Team collaboration (up to 3 seats)",
      "Priority email support",
      "Referral program",
    ],
  },
  {
    key: "agency",
    label: "Agency",
    monthlyPrice: 149,
    annualPrice: 119,
    description: "For agencies managing multiple client accounts.",
    icon: <Building2 className="w-5 h-5" />,
    color: "from-amber-500 to-orange-600",
    badge: "Best Value",
    cta: "Start Agency Trial",
    features: [
      "Unlimited campaigns",
      "Unlimited thread discoveries",
      "Unlimited connected accounts",
      "AI comment generation & editing",
      "Full analytics suite",
      "Unlimited scheduling",
      "Unlimited team seats + role permissions",
      "White-label ready",
      "Dedicated account manager",
      "SLA support",
    ],
  },
];

// ─── Comparison table data ─────────────────────────────────────────────────────

type CellValue = boolean | string;

const COMPARISON_ROWS: { category: string; rows: { feature: string; free: CellValue; pro: CellValue; agency: CellValue }[] }[] = [
  {
    category: "Core Features",
    rows: [
      { feature: "Active campaigns", free: "1", pro: "5", agency: "Unlimited" },
      { feature: "Thread discoveries / month", free: "50", pro: "Unlimited", agency: "Unlimited" },
      { feature: "Connected social accounts", free: "2", pro: "10", agency: "Unlimited" },
      { feature: "AI comment generation", free: true, pro: true, agency: true },
      { feature: "Inline comment editing", free: false, pro: true, agency: true },
      { feature: "Bulk approve queue", free: false, pro: true, agency: true },
    ],
  },
  {
    category: "Platforms",
    rows: [
      { feature: "Twitter / X", free: true, pro: true, agency: true },
      { feature: "LinkedIn", free: true, pro: true, agency: true },
      { feature: "Instagram", free: true, pro: true, agency: true },
      { feature: "Reddit", free: false, pro: true, agency: true },
      { feature: "TikTok", free: false, pro: true, agency: true },
    ],
  },
  {
    category: "Analytics",
    rows: [
      { feature: "Basic follower stats", free: true, pro: true, agency: true },
      { feature: "Follower growth chart (90 days)", free: false, pro: true, agency: true },
      { feature: "Campaign ROI tracking", free: false, pro: true, agency: true },
      { feature: "Engagement rate analytics", free: false, pro: true, agency: true },
      { feature: "Export data as CSV", free: false, pro: false, agency: true },
    ],
  },
  {
    category: "Automation",
    rows: [
      { feature: "Campaign scheduling", free: false, pro: "5 / campaign", agency: "Unlimited" },
      { feature: "Daily auto-sync", free: true, pro: true, agency: true },
      { feature: "Onboarding wizard", free: true, pro: true, agency: true },
      { feature: "Campaign templates", free: "3 templates", pro: "All templates", agency: "All + custom" },
    ],
  },
  {
    category: "Team & Collaboration",
    rows: [
      { feature: "Team seats", free: "1 (owner only)", pro: "3 seats", agency: "Unlimited" },
      { feature: "Role-based permissions", free: false, pro: true, agency: true },
      { feature: "White-label branding", free: false, pro: false, agency: true },
    ],
  },
  {
    category: "Support",
    rows: [
      { feature: "Email support", free: true, pro: true, agency: true },
      { feature: "Priority support", free: false, pro: true, agency: true },
      { feature: "Dedicated account manager", free: false, pro: false, agency: true },
      { feature: "SLA guarantee", free: false, pro: false, agency: true },
    ],
  },
];

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — the Free plan is free forever with no credit card required. Pro and Agency plans include a 7-day free trial so you can test all features before committing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel your subscription at any time from the Billing page. Your plan stays active until the end of the current billing period, then reverts to Free.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is preserved. If you exceed the Free plan limits (e.g. more than 1 campaign), excess campaigns are paused rather than deleted. You can reactivate them by upgrading again.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — annual billing saves you 20% compared to monthly. You can switch between monthly and annual billing at any time from the Billing page.",
  },
  {
    q: "How many social accounts can I connect?",
    a: "Free: 2 accounts. Pro: 10 accounts. Agency: unlimited accounts across Twitter/X, LinkedIn, Instagram, Reddit, and TikTok.",
  },
  {
    q: "Does Social Growth Engine comply with platform terms of service?",
    a: "Yes. Our engagement automation operates within each platform's rate limits and API guidelines. We use a human-in-the-loop approval workflow so every comment is reviewed before posting.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function Cell({ value }: { value: CellValue }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-white/20 mx-auto" />;
  return <span className="text-sm text-white/70 text-center block">{value}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-violet-500/30 transition-colors"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-medium text-white">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/40 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        )}
      </div>
      {open && (
        <div className="px-6 pb-5 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Simple, transparent{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            pricing
          </span>
        </h1>
        <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
          Start free. Upgrade when you are ready to grow faster. No hidden fees, no long-term contracts.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-2 py-1.5">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              !annual ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              annual ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Annual
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const isPopular = plan.badge === "Most Popular";
            return (
              <div
                key={plan.key}
                className={`relative bg-white/5 border rounded-2xl p-7 flex flex-col transition-all ${
                  isPopular
                    ? "border-violet-500/50 shadow-lg shadow-violet-500/10 scale-[1.02]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={`text-xs px-3 py-1 ${
                        isPopular
                          ? "bg-violet-600 text-white border-violet-500"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-4`}
                  >
                    {plan.icon}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{plan.label}</h2>
                  <p className="text-sm text-white/50">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${price}</span>
                    {price > 0 && (
                      <span className="text-white/40 text-sm mb-1.5">/mo{annual ? " billed annually" : ""}</span>
                    )}
                    {price === 0 && <span className="text-white/40 text-sm mb-1.5">forever</span>}
                  </div>
                  {annual && price > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/year
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Button
                  className={`w-full mb-6 font-semibold ${
                    isPopular
                      ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 hover:opacity-90"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                  }`}
                  onClick={() => window.location.href = getLoginUrl()}
                >
                  {plan.cta}
                </Button>

                {/* Feature list */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Social proof bar */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-violet-900/30 to-cyan-900/30 border border-violet-500/20 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-white/80 italic mb-4 max-w-lg mx-auto">
            "Social Growth Engine tripled my Twitter following in 60 days. The AI drafts are surprisingly good — I approve about 80% of them without editing."
          </p>
          <p className="text-sm text-white/40">— Marcus T., SaaS Founder · Pro Plan</p>
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-8 text-sm text-white/50">
            <span><strong className="text-white">2,400+</strong> active users</span>
            <span><strong className="text-white">4.8/5</strong> average rating</span>
            <span><strong className="text-white">12M+</strong> threads discovered</span>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Full Feature Comparison</h2>
        <p className="text-white/50 text-center text-sm mb-10">Everything included in each plan at a glance.</p>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-white/60 font-medium w-1/2">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.key} className="px-4 py-4 text-center font-semibold text-white">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((section) => (
                <>
                  <tr key={`cat-${section.category}`} className="bg-white/[0.03] border-t border-white/10">
                    <td colSpan={4} className="px-6 py-2.5 text-xs font-semibold text-violet-400 uppercase tracking-wider">
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.feature} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5 text-white/70">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.free} /></td>
                      <td className="px-4 py-3.5 text-center bg-violet-500/5"><Cell value={row.pro} /></td>
                      <td className="px-4 py-3.5 text-center"><Cell value={row.agency} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Frequently Asked Questions</h2>
        <p className="text-white/50 text-center text-sm mb-10">Still have questions? <a href="/contact" className="text-violet-400 hover:text-violet-300 transition-colors">Contact us</a>.</p>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-violet-900/40 to-cyan-900/40 border border-violet-500/20 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to grow your audience?</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto text-sm">
            Start free today — no credit card required. Upgrade to Pro or Agency when you are ready to scale.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 hover:opacity-90 font-semibold"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = "/contact"}
            >
              Talk to Sales
            </Button>
          </div>
          <p className="text-xs text-white/30 mt-4">No credit card required · Cancel anytime · 7-day free trial on paid plans</p>
        </div>
      </section>
    </PublicPageLayout>
  );
}
