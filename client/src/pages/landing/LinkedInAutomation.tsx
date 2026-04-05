import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Linkedin, TrendingUp, Zap, Users, CheckCircle, BarChart3, MessageSquare, Briefcase } from "lucide-react";

const features = [
  { icon: Briefcase, title: "B2B Audience Targeting", desc: "Reach decision-makers, founders, and professionals by job title, industry, and company size." },
  { icon: MessageSquare, title: "Thought Leadership Replies", desc: "AI crafts professional, insightful comments that position you as an expert in your field." },
  { icon: TrendingUp, title: "Connection Growth", desc: "Grow your LinkedIn network with relevant connections who match your ideal customer profile." },
  { icon: BarChart3, title: "Post Performance Analytics", desc: "Track impressions, engagement rate, and follower growth from your LinkedIn activity." },
  { icon: Users, title: "Team Collaboration", desc: "Manage multiple LinkedIn profiles from one dashboard with role-based access control." },
  { icon: Zap, title: "Safe Automation", desc: "Human-paced engagement that stays within LinkedIn's rate limits to protect your account." },
];

export default function LinkedInAutomation() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10">
          <Linkedin className="w-3.5 h-3.5 mr-1.5" /> LinkedIn Automation
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Grow Your{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            LinkedIn Presence
          </span>{" "}
          with AI
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Automate LinkedIn engagement to build authority, generate leads, and grow your professional network — without spending hours on the platform every day.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Growing Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            View Pricing
          </Button>
        </div>
      </section>

      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["5,000+", "LinkedIn Profiles"], ["1.8M+", "Comments Posted"], ["3.2x", "Avg. Profile Views"], ["4.7★", "Average Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Professional LinkedIn Growth at Scale</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Built for B2B founders, consultants, and sales professionals who want to build authority without the manual grind.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Build Your LinkedIn Authority Today</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Start automating your LinkedIn engagement and watch your network, leads, and opportunities grow.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "GDPR compliant"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-blue-400" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
