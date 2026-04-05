import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { Zap, Target, Shield, CheckCircle } from "lucide-react";

const values = [
  { icon: Zap, title: "Growth First", desc: "Every feature we build is measured by one question: does it help users grow their audience faster?" },
  { icon: Target, title: "Authentic Engagement", desc: "We believe in real connections. Our AI helps you find and engage people who genuinely care about your content." },
  { icon: Shield, title: "Account Safety", desc: "Rate-safe automation, human-paced engagement, and official OAuth — we never compromise your account security." },
];

export default function About() {
  return (
    <PublicPageLayout>
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">About Us</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          We're Building the{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Future of Social Growth
          </span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Social Growth Engine was built by a team of growth engineers and AI researchers who were tired of spending hours on manual social media engagement. We built the tool we wished existed.
        </p>
      </section>
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-white/70 leading-relaxed mb-6">
            Social media growth should not require a full-time team or a massive budget. Our mission is to democratize audience growth by giving every creator, startup, and small business access to the same AI-powered engagement tools that enterprise brands use.
          </p>
          <p className="text-white/70 leading-relaxed">
            We connect to Twitter/X, LinkedIn, Instagram, Reddit, and TikTok — and we use AI to find the right conversations, craft authentic replies, and track follower growth over time. No fake followers, no spam, no account bans. Just real, sustainable growth.
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-10">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 mx-auto">
                <Icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-violet-900/40 to-cyan-900/40 border border-violet-500/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Join Us</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">Start growing your audience with Social Growth Engine today — completely free.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-10" onClick={() => window.location.href = getLoginUrl()}>
              Get Started Free
            </Button>
            <p className="text-sm text-white/40">No credit card required</p>
          </div>
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {["Free plan available", "Cancel anytime", "Real audience growth"].map(item => (
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
