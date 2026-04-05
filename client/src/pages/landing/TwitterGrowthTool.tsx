import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Twitter, TrendingUp, Zap, Users, CheckCircle, BarChart3, MessageSquare, Target } from "lucide-react";

const features = [
  { icon: Target, title: "Intent-Based Discovery", desc: "Find tweets where your ideal followers are actively asking for solutions you provide." },
  { icon: MessageSquare, title: "AI Reply Generation", desc: "Generate contextually relevant, human-sounding replies that drive profile visits and follows." },
  { icon: TrendingUp, title: "Follower Growth Tracking", desc: "Daily snapshots of your follower count with trend charts and net-change badges." },
  { icon: BarChart3, title: "Engagement Analytics", desc: "Track reply performance, impressions, and conversion rates per campaign." },
  { icon: Users, title: "Audience Targeting", desc: "Filter by keyword, hashtag, account type, and engagement level to reach the right people." },
  { icon: Zap, title: "Automated Scheduling", desc: "Set daily engagement budgets and let the engine run 24/7 without manual effort." },
];

export default function TwitterGrowthTool() {
  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/10">
          <Twitter className="w-3.5 h-3.5 mr-1.5" /> Twitter / X Growth
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          The Smartest{" "}
          <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
            Twitter Growth Tool
          </span>{" "}
          Powered by AI
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Stop chasing followers manually. Social Growth Engine discovers high-intent conversations on Twitter/X and engages them with AI-crafted replies — growing your audience on autopilot.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-sky-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Growing Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            View Pricing
          </Button>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["10,000+", "Accounts Growing"], ["2.4M+", "Replies Sent"], ["98%", "Uptime SLA"], ["4.8★", "Average Rating"]].map(([val, label]) => (
            <div key={label}>
              <p className="text-3xl font-bold text-white">{val}</p>
              <p className="text-sm text-white/50 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything You Need to Grow on Twitter</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">A complete toolkit for organic Twitter/X growth — no bots, no fake followers, just genuine engagement at scale.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-sky-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-sky-900/40 to-cyan-900/40 border border-sky-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Grow Your Twitter Following?</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Join thousands of creators and founders who are growing their Twitter audience with AI-powered engagement.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8">
            {["Free plan available", "Cancel anytime", "Real followers only"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-sky-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
