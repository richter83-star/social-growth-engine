import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Briefcase, Users, Megaphone, BarChart3, Shield, DollarSign, CheckCircle } from "lucide-react";

const features = [
  { icon: Briefcase, title: "Multi-Client Management", desc: "Manage unlimited client accounts from a single agency dashboard with role-based access." },
  { icon: Users, title: "Team Collaboration", desc: "Invite team members with different permission levels — admin, editor, and viewer roles." },
  { icon: Megaphone, title: "Bulk Campaign Creation", desc: "Create and deploy engagement campaigns across multiple client accounts simultaneously." },
  { icon: BarChart3, title: "Client Reporting", desc: "Generate branded performance reports showing follower growth, engagement, and campaign results." },
  { icon: Shield, title: "White-Label Ready", desc: "Deliver results under your agency brand with customizable report templates." },
  { icon: DollarSign, title: "Agency Pricing", desc: "Volume discounts and dedicated support for agencies managing 10+ client accounts." },
];

export default function ForAgencies() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10">
          <Briefcase className="w-3.5 h-3.5 mr-1.5" /> For Agencies
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Social Media Growth{" "}
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Platform for Agencies
          </span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
          Manage social media growth for all your clients from one platform. Social Growth Engine's Agency plan supports unlimited client accounts, team collaboration, white-label reporting, and bulk campaign management.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25 px-8" onClick={() => window.location.href = getLoginUrl()}>
            Start Agency Trial
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 px-8" onClick={() => window.location.href = "/pricing"}>
            Agency Pricing
          </Button>
        </div>
      </section>
      <section className="border-y border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-10 text-center">
          {[["Unlimited", "Client Accounts"], ["Team", "Collaboration"], ["White-Label", "Reports"], ["Dedicated", "Support"]].map(([val, label]) => (
            <div key={label}><p className="text-3xl font-bold text-white">{val}</p><p className="text-sm text-white/50 mt-1">{label}</p></div>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything Your Agency Needs</h2>
        <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Scale your agency's social media services without scaling your headcount.</p>
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
        <div className="bg-gradient-to-br from-blue-900/40 to-violet-900/40 border border-blue-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Grow Your Agency with AI</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Deliver better results for more clients without adding headcount. Start your agency trial today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Start Agency Trial
            </Button>
            <p className="text-sm text-white/40">14-day free trial included</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Unlimited clients", "Team access included", "Dedicated support"].map(item => (
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
