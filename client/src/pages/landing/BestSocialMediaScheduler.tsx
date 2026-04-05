import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Calendar, Clock, Zap, Users, CheckCircle, BarChart3 } from "lucide-react";

const features = [
  { icon: Clock, title: "Peak Time Scheduling", desc: "AI identifies the best times to engage based on your audience's activity patterns." },
  { icon: Calendar, title: "Campaign Scheduling", desc: "Set start/end dates, daily limits, and engagement budgets for each campaign." },
  { icon: Zap, title: "Cron-Based Automation", desc: "Daily automated sync runs at 2 AM UTC to keep all follower data fresh." },
  { icon: Users, title: "Multi-Account Scheduling", desc: "Schedule campaigns across multiple social accounts simultaneously." },
  { icon: CheckCircle, title: "Approval Workflows", desc: "Set auto-approve or manual review mode per campaign for full control." },
  { icon: BarChart3, title: "Schedule History", desc: "View past scheduled runs with success rates, accounts synced, and errors." },
];

export default function BestSocialMediaScheduler() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/10">
          <Calendar className="w-3.5 h-3.5 mr-1.5" /> Smart Scheduler
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          The{" "}
          <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            Best Social Media Scheduler
          </span>{" "}
          for Growth
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Schedule social media campaigns to run at peak engagement times. Set daily budgets, define targeting rules, and let the AI scheduler maximize your reach automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-pink-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Scheduling Free
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            View Pricing
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["24/7", "Always Running"], ["2 AM UTC", "Daily Auto-Sync"], ["Unlimited", "Campaigns"], ["4.8★", "Rating"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Schedule Once, Grow Forever</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Set your campaigns and let the AI scheduler run them at the optimal time, every day.</p>
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
        <div className="bg-gradient-to-br from-pink-900/40 to-violet-900/40 border border-pink-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Automate Your Growth Schedule</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Set up your first campaign in minutes and let the scheduler handle the rest.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-pink-600 to-violet-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "Unlimited schedules"].map(item => (
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
