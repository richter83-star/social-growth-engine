import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Zap, CheckCircle, Globe, Shield, BarChart3, MessageSquare, Target, Megaphone } from "lucide-react";

const features = [
  { icon: Target, title: "Intent Detection", desc: "Find conversations where your audience is actively seeking solutions you provide." },
  { icon: MessageSquare, title: "Smart Reply Queue", desc: "Review and approve AI replies before posting with a one-click workflow." },
  { icon: Globe, title: "Multi-Platform", desc: "Engage on Twitter, LinkedIn, Instagram, Reddit, and TikTok simultaneously." },
  { icon: Shield, title: "Rate-Safe Automation", desc: "Human-paced engagement that respects platform limits and protects your account." },
  { icon: BarChart3, title: "Performance Tracking", desc: "Track engagement rates, reply impressions, and follower conversion per campaign." },
  { icon: Megaphone, title: "Campaign Management", desc: "Run multiple engagement campaigns with different targeting rules and budgets." },
];

export default function AutomatedSocialEngagement() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Automated Engagement
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Automated{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Social Engagement
          </span>{" "}
          at Scale
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Automate your social media engagement across Twitter, LinkedIn, Instagram, and Reddit. Discover high-intent conversations and respond with AI-crafted messages that drive real follower growth.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-emerald-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/features"}>
            See Features
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["5 Platforms", "Supported"], ["24/7", "Automated"], ["60s", "Rate Limit Guard"], ["4.8★", "Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Engage Smarter Across Every Platform</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">One platform to discover, engage, and grow across all major social networks.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Start Automating Your Engagement Today</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Connect your accounts, set your targeting, and let AI handle the rest.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "5 platforms included"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
