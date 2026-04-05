import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { BarChart3, TrendingUp, Globe, Zap, CheckCircle, RefreshCw, Download } from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Follower Growth Charts", desc: "Daily snapshots of follower counts per account with net-change badges and 7/30/90 day views." },
  { icon: BarChart3, title: "Engagement Rate Tracking", desc: "Monitor reply impressions, click-through rates, and audience conversion metrics." },
  { icon: Globe, title: "Cross-Platform Dashboard", desc: "Unified view of all your social accounts with platform-specific breakdowns." },
  { icon: Zap, title: "AI Insights", desc: "AI-generated recommendations based on your engagement data and growth trends." },
  { icon: Download, title: "Export Reports", desc: "Export follower growth and engagement data as CSV for client reporting." },
  { icon: RefreshCw, title: "Real-Time Updates", desc: "Live data sync with manual Sync Now button and 60-second rate limiting." },
];

export default function SocialMediaAnalyticsPage() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/10">
          <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Social Analytics
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Social Media{" "}
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Analytics Dashboard
          </span>{" "}
          Built for Growth
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Get deep insights into your social media performance with real-time follower growth charts, engagement analytics, and AI-powered recommendations to optimize your strategy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border-0 shadow-lg shadow-orange-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            View Your Analytics Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/features"}>
            See All Features
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["6 Platforms", "Tracked"], ["Daily", "Snapshots"], ["90 Days", "History"], ["Real-Time", "Sync"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Know Exactly What's Working</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Stop guessing. Track every follower gain, engagement spike, and campaign result with precision.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 border border-orange-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Start Tracking Your Growth Today</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Connect your accounts and get your first analytics dashboard in minutes — completely free.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "All platforms included"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-orange-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
