import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { TrendingUp, Target, MessageSquare, BarChart3, DollarSign, Zap, CheckCircle, Star } from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Audience Growth", desc: "Grow your follower count consistently with AI that engages your target audience 24/7." },
  { icon: Target, title: "Niche Targeting", desc: "Reach people who are genuinely interested in your content niche and likely to follow and engage." },
  { icon: MessageSquare, title: "Engagement Boost", desc: "AI replies to relevant conversations drive profile visits and organic follower growth." },
  { icon: BarChart3, title: "Content Performance", desc: "Track which campaigns and platforms are driving the most follower growth for your content." },
  { icon: DollarSign, title: "Monetization Ready", desc: "Grow the audience size needed to unlock brand deals, sponsorships, and platform monetization." },
  { icon: Zap, title: "Creator-Friendly Pricing", desc: "Free plan available with no credit card required — upgrade when you are ready to scale." },
];

export default function ForCreators() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/10">
          <Star className="w-3.5 h-3.5 mr-1.5" /> For Creators
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Grow Your Audience{" "}
          <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
            as a Creator
          </span>{" "}
          with AI
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Grow your audience, increase engagement, and monetize your content faster. Social Growth Engine helps creators on Twitter, LinkedIn, and Instagram build genuine followings through AI-powered engagement.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white border-0 shadow-lg shadow-pink-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Growing Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            View Pricing
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["Free", "Plan Available"], ["3 Platforms", "Supported"], ["24/7", "Engagement"], ["4.9★", "Creator Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Built for Creators Who Want to Grow</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Stop spending hours engaging manually. Let AI grow your audience while you focus on creating content.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-pink-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-pink-900/40 to-orange-900/40 border border-pink-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Start Growing Your Creator Audience</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Join thousands of creators who are growing their audience with AI-powered engagement.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-pink-600 to-orange-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "Real followers only"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-pink-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
