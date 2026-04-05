import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Zap, BarChart3, Target, Calendar, Shield, Globe, TrendingUp, MessageSquare, RefreshCw, Users, CheckCircle, Megaphone } from "lucide-react";

const sections = [
  {
    title: "AI-Powered Engagement",
    color: "violet",
    items: [
      { icon: Target, title: "Keyword Targeting", desc: "Find conversations in your niche using keyword and hashtag targeting across platforms." },
      { icon: MessageSquare, title: "Smart Reply Queue", desc: "Review AI-generated replies before posting, or set auto-approve for hands-free operation." },
      { icon: Shield, title: "Rate-Safe Automation", desc: "Human-paced engagement that respects platform limits and keeps your accounts safe." },
    ],
  },
  {
    title: "Analytics & Tracking",
    color: "cyan",
    items: [
      { icon: TrendingUp, title: "Follower Growth Chart", desc: "Multi-line chart showing absolute follower counts per account with 7/30/90-day views." },
      { icon: BarChart3, title: "Engagement Analytics", desc: "Track reply impressions, click-through rates, and audience conversion per campaign." },
      { icon: RefreshCw, title: "Real-Time Sync", desc: "Manual Sync Now button with 60-second cooldown, or daily auto-sync at 2 AM UTC." },
    ],
  },
  {
    title: "Campaign Management",
    color: "emerald",
    items: [
      { icon: Megaphone, title: "Multi-Campaign Support", desc: "Run multiple engagement campaigns simultaneously with different targeting rules." },
      { icon: Calendar, title: "Scheduled Automation", desc: "Set start/end dates, daily budgets, and engagement limits per campaign." },
      { icon: Users, title: "Multi-Account", desc: "Connect and manage Twitter, LinkedIn, Instagram, and more from one dashboard." },
    ],
  },
  {
    title: "Platform & Security",
    color: "orange",
    items: [
      { icon: Globe, title: "5 Platforms", desc: "Twitter/X, LinkedIn, Instagram, Reddit, and TikTok — all from one unified dashboard." },
      { icon: Shield, title: "Secure OAuth", desc: "Connect accounts via official OAuth — no passwords stored, full revocation control." },
      { icon: Zap, title: "Fast Setup", desc: "Connect your first account and launch a campaign in under 3 minutes." },
    ],
  },
];

const colorMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};
const iconColorMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400",
  cyan: "bg-cyan-500/10 text-cyan-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  orange: "bg-orange-500/10 text-orange-400",
};

export default function FeaturesPage() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
          <Zap className="w-3.5 h-3.5 mr-1.5" /> All Features
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Everything You Need to{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Grow on Social</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Social Growth Engine combines AI engagement automation, follower analytics, and campaign management into one platform built for real audience growth.
        </p>
        <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
          Start Free — No Credit Card
        </Button>
      </section>
      {sections.map(({ title, color, items }) => (
        <section key={title} className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Badge className={`${colorMap[color]} hover:${colorMap[color]}`}>{title}</Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {items.map(({ icon: Icon, title: t, desc }) => (
              <div key={t} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${iconColorMap[color]} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">{t}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-violet-900/40 to-cyan-900/40 border border-violet-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Growing?</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Connect your accounts and launch your first campaign in minutes — completely free.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "5 platforms included"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-violet-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
