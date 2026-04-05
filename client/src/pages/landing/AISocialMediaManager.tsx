import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Bot, CheckCircle, Zap, Globe, BarChart3, Calendar, MessageSquare, Shield } from "lucide-react";

const features = [
  { icon: Bot, title: "AI Content Assistant", desc: "Generate on-brand replies, comments, and engagement copy across all your social platforms." },
  { icon: Globe, title: "Multi-Platform Management", desc: "Manage Twitter, LinkedIn, Instagram, Reddit, and TikTok from a single unified dashboard." },
  { icon: Calendar, title: "Smart Scheduling", desc: "Schedule campaigns to run at peak engagement times automatically, 24 hours a day." },
  { icon: BarChart3, title: "Unified Analytics", desc: "Cross-platform performance dashboard with follower growth, engagement rates, and ROI metrics." },
  { icon: MessageSquare, title: "Engagement Queue", desc: "Review, approve, or edit AI-generated replies before they go live with a one-click workflow." },
  { icon: Shield, title: "Brand Safety Controls", desc: "Set tone, topic, and keyword filters to ensure every reply matches your brand voice." },
];

export default function AISocialMediaManager() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">
          <Bot className="w-3.5 h-3.5 mr-1.5" /> AI Social Media Manager
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Your AI{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Social Media Manager
          </span>{" "}
          Never Sleeps
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Replace hours of manual social media work with an AI that discovers opportunities, crafts replies, and grows your audience across every platform — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Try It Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/features"}>
            See All Features
          </Button>
        </div>
      </section>

      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["6", "Platforms Supported"], ["24/7", "Automated Engagement"], ["3 min", "Average Setup Time"], ["4.9★", "Average Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">One AI Manager for All Your Social Channels</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Stop juggling tabs. Manage your entire social media presence from one intelligent platform.</p>
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
          <h2 className="text-3xl font-bold mb-4">Let AI Handle Your Social Media</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Get started in minutes. Connect your accounts, set your goals, and let the AI do the rest.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Start Free Today
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "All platforms included"].map(item => (
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
