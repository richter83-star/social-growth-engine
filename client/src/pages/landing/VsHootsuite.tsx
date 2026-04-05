import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { CheckCircle, XCircle } from "lucide-react";

const rows = [
  { feature: "AI-powered engagement automation", sge: true, them: false },
  { feature: "Follower growth line chart (90-day history)", sge: true, them: false },
  { feature: "Daily auto-sync scheduler", sge: true, them: false },
  { feature: "Multi-platform support (Twitter, LinkedIn, Instagram)", sge: true, them: true },
  { feature: "Campaign targeting by keyword", sge: true, them: false },
  { feature: "Free plan available", sge: true, them: false },
  { feature: "Rate-safe engagement (no bans)", sge: true, them: true },
  { feature: "Built-in analytics dashboard", sge: true, them: true },
  { feature: "Manual reply approval workflow", sge: true, them: false },
  { feature: "Startup-friendly pricing", sge: true, them: false },
];

export default function VsHootsuite() {
  return (
    <PublicPageLayout>
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">Comparison</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Social Growth Engine vs{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Hootsuite</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Hootsuite is a scheduling tool. Social Growth Engine is a growth engine. See how they compare for teams focused on building an audience, not just publishing content.
        </p>
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 bg-white/5 px-6 py-4 text-sm font-semibold text-white/60">
            <span>Feature</span>
            <span className="text-center text-violet-400">Social Growth Engine</span>
            <span className="text-center">Hootsuite</span>
          </div>
          {rows.map(({ feature, sge, them }) => (
            <div key={feature} className="grid grid-cols-3 px-6 py-4 border-t border-white/5 items-center hover:bg-white/[0.02] transition-colors">
              <span className="text-sm text-white/80">{feature}</span>
              <span className="flex justify-center">{sge ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400/60" />}</span>
              <span className="flex justify-center">{them ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400/60" />}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Switch?</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Get started with Social Growth Engine free — no credit card required.</p>
          <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
            Start Free Today
          </Button>
        </div>
      </section>
    </PublicPageLayout>
  );
}
