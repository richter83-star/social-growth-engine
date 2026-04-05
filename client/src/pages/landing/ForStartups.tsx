import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Rocket, TrendingUp, Users, DollarSign, Zap, BarChart3, CheckCircle } from "lucide-react";

const features = [
  { icon: Rocket, title: "Founder-Led Growth", desc: "Build your personal brand as a founder while growing your company's social presence simultaneously." },
  { icon: TrendingUp, title: "Investor Visibility", desc: "Engage with VC and angel investor conversations to get on the radar of potential backers." },
  { icon: Users, title: "Early Customer Acquisition", desc: "Find and engage potential customers who are actively discussing problems your startup solves." },
  { icon: DollarSign, title: "Budget-Friendly Plans", desc: "Startup-friendly pricing with a free tier and affordable Pro plan that scales with your growth." },
  { icon: Zap, title: "Fast Setup", desc: "Connect your accounts and launch your first campaign in under 3 minutes." },
  { icon: BarChart3, title: "Analytics for Founders", desc: "Track follower growth, engagement rates, and campaign ROI from a simple dashboard." },
];

export default function ForStartups() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
          <Rocket className="w-3.5 h-3.5 mr-1.5" /> For Startups
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Social Media Growth{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Built for Startups
          </span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Early-stage startups need visibility fast. Social Growth Engine helps founders build an audience, attract investors, and generate early customers through AI-powered social engagement — without a marketing team.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Growing Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            View Pricing
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["3 min", "Setup Time"], ["Free", "Starter Plan"], ["24/7", "Automated Growth"], ["4.9★", "Founder Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Built for Founders Who Move Fast</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Everything a startup needs to build an audience, attract investors, and acquire early customers through social media.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-violet-900/40 to-cyan-900/40 border border-violet-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Launch Your Startup's Social Growth</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Join hundreds of founders using AI to build their audience and attract early customers.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "No marketing team needed"].map(item => (
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
