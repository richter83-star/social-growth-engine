import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Zap, Search, MessageSquare, BarChart3, Calendar, Users,
  Twitter, Linkedin, CheckCircle, ArrowRight, Star, Shield,
  TrendingUp, Bot, Globe, ChevronRight, Menu, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// ─── Sticky Nav ───────────────────────────────────────────────────────────────
function Nav({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Growth Engine</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <a key={link.href} href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={onLogin}>
            Log in
          </Button>
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25" onClick={onLogin}>
            Start Free
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0f]/98 border-b border-white/10 px-6 py-4 flex flex-col gap-4">
          {navLinks.map(link => (
            <a key={link.href} href={link.href} className="text-sm text-white/70 hover:text-white" onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 w-full" onClick={onLogin}>
            Start Free
          </Button>
        </div>
      )}
    </nav>
  );
}

// ─── Demo Video Modal ─────────────────────────────────────────────────────────
const DEMO_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663173269466/VjDim4zfSa7JibwAxW3pTx/demo_final_5e533c7a.mp4";

function DemoModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/30 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/80 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Video */}
        <video
          ref={videoRef}
          src={DEMO_VIDEO_URL}
          autoPlay
          controls
          className="w-full aspect-video bg-black"
          playsInline
        />
        <div className="bg-[#0d0d18] px-6 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-sm text-white/60">Social Growth Engine — Live Demo</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onLogin }: { onLogin: () => void }) {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-cyan-600/15 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        <Badge className="mb-6 bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/20 px-4 py-1.5 text-sm">
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Autonomous Social Growth — Powered by AI Swarms
        </Badge>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Grow Your Social{" "}
          <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Presence on Autopilot
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Growth Engine autonomously discovers high-intent conversations across Twitter, Reddit, LinkedIn, Instagram, and TikTok — then generates and posts value-adding comments that grow your audience while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-xl shadow-violet-500/30 px-8 h-12 text-base font-semibold"
            onClick={onLogin}
          >
            Start Free — No Credit Card
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white h-12 px-8 text-base bg-transparent gap-2"
            onClick={() => setShowDemo(true)}
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-white ml-0.5" />
            </div>
            Watch Demo
          </Button>
        </div>

        {/* Demo video preview thumbnail */}
        <div
          className="relative max-w-3xl mx-auto mb-16 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-500/20 cursor-pointer group"
          onClick={() => setShowDemo(true)}
        >
          <video
            src={DEMO_VIDEO_URL}
            className="w-full aspect-video object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-white ml-1" />
            </div>
          </div>
          {/* Label */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs text-white/80 font-medium">Live Platform Demo · 30s</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: "5", label: "Platforms Supported", suffix: "" },
            { value: "10x", label: "Faster Than Manual", suffix: "" },
            { value: "24/7", label: "Autonomous Operation", suffix: "" },
            { value: "100%", label: "Context-Aware AI", suffix: "" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-3xl font-black text-white">{stat.value}{stat.suffix}</div>
              <div className="text-xs text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo modal */}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Search,
    color: "from-violet-500 to-violet-700",
    title: "Autonomous Thread Discovery",
    desc: "AI-powered crawlers scan Twitter, Reddit, LinkedIn, Instagram, and TikTok 24/7 to find high-intent conversations where your voice adds real value.",
  },
  {
    icon: Bot,
    color: "from-cyan-500 to-cyan-700",
    title: "Context-Aware AI Comments",
    desc: "Swarm agents read the full thread context and generate genuine, value-adding comments that match your persona — not generic spam.",
  },
  {
    icon: Calendar,
    color: "from-emerald-500 to-emerald-700",
    title: "Set-and-Forget Scheduling",
    desc: "Configure campaigns to run discovery automatically on any schedule — daily, twice daily, or custom cron. Fully hands-off once set up.",
  },
  {
    icon: BarChart3,
    color: "from-orange-500 to-orange-700",
    title: "Real-Time Analytics",
    desc: "Track follower growth, engagement rates, and ROI across all platforms from a single dashboard with live-updating charts.",
  },
  {
    icon: Shield,
    color: "from-pink-500 to-pink-700",
    title: "Team Roles & Permissions",
    desc: "Invite collaborators as Editors, Reviewers, or Viewers. Control exactly who can approve, reject, or edit AI-generated comments.",
  },
  {
    icon: TrendingUp,
    color: "from-indigo-500 to-indigo-700",
    title: "Self-Optimizing Strategy",
    desc: "The online learning engine tracks which comment styles drive the most growth and automatically shifts your campaign strategy toward what works.",
  },
];

function Features() {
  return (
    <section id="features" className="bg-[#0d0d14] py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20">
            Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Everything you need to grow{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">autonomously</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            A complete AI-powered growth stack — from discovery to engagement to analytics.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="group bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: Users,
      title: "Connect Your Accounts",
      desc: "Add your Twitter, Reddit, LinkedIn, Instagram, and TikTok profiles in minutes. Your credentials are encrypted and stored securely.",
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      num: "02",
      icon: Globe,
      title: "Configure Your Campaign",
      desc: "Set your target keywords, choose platforms, define your engagement persona, and pick a schedule. The AI handles the rest.",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      num: "03",
      icon: TrendingUp,
      title: "Watch Your Audience Grow",
      desc: "The engine discovers threads, generates comments, queues them for your review, and tracks every engagement — fully on autopilot.",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#0a0a0f] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
            How It Works
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Up and running in{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">3 steps</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            No complex setup. No ongoing manual work. Just configure once and let the engine run.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-emerald-500/30" />

          {steps.map(step => (
            <div key={step.num} className="relative flex flex-col items-center text-center">
              <div className={`w-24 h-24 rounded-2xl border ${step.bg} flex items-center justify-center mb-6 relative z-10`}>
                <step.icon className={`w-10 h-10 ${step.color}`} />
                <span className={`absolute -top-3 -right-3 text-xs font-black ${step.color} bg-[#0a0a0f] px-2 py-0.5 rounded-full border border-white/10`}>
                  {step.num}
                </span>
              </div>
              <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "Perfect for getting started and testing the engine.",
    highlight: false,
    badge: null,
    features: [
      "1 active campaign",
      "50 thread discoveries/mo",
      "3 social accounts",
      "Basic analytics",
      "Engagement queue",
      "Community support",
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    desc: "For creators and founders serious about growth.",
    highlight: true,
    badge: "Most Popular",
    features: [
      "5 active campaigns",
      "Unlimited discoveries",
      "10 social accounts",
      "Advanced analytics & ROI",
      "Scheduling automation",
      "Team roles (3 members)",
      "Priority support",
    ],
    cta: "Start Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "Agency",
    price: "$149",
    period: "/mo",
    desc: "For agencies managing multiple clients at scale.",
    highlight: false,
    badge: null,
    features: [
      "Unlimited campaigns",
      "Unlimited discoveries",
      "Unlimited social accounts",
      "Full analytics suite",
      "Advanced scheduling",
      "Unlimited team members",
      "White-label ready",
      "Dedicated support",
    ],
    cta: "Start Agency",
    ctaVariant: "outline" as const,
  },
];

function Pricing({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="pricing" className="bg-[#0d0d14] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/20">
            Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">pricing</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you're ready to scale. No hidden fees, no contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? "bg-gradient-to-b from-violet-600/20 to-cyan-600/10 border-2 border-violet-500/50 shadow-2xl shadow-violet-500/20 scale-[1.02]"
                  : "bg-white/[0.03] border border-white/10 hover:border-white/20"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-4 py-1 shadow-lg">
                    <Star className="w-3 h-3 mr-1" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-white/40 mb-1">{plan.period}</span>
                </div>
                <p className="text-white/50 text-sm">{plan.desc}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-11 font-semibold ${
                  plan.highlight
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/30"
                    : "border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent"
                }`}
                variant={plan.highlight ? "default" : "outline"}
                onClick={onLogin}
              >
                {plan.cta}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          All plans include a 14-day free trial. Test with card <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/50">4242 4242 4242 4242</code>.
        </p>
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  const platforms = [
    { icon: Twitter, name: "Twitter / X", color: "text-sky-400" },
    { icon: Linkedin, name: "LinkedIn", color: "text-blue-400" },
    { icon: MessageSquare, name: "Reddit", color: "text-orange-400" },
    { icon: Globe, name: "Instagram", color: "text-pink-400" },
    { icon: Zap, name: "TikTok", color: "text-purple-400" },
  ];

  return (
    <section className="bg-[#0a0a0f] py-16 px-6 border-y border-white/5">
      <div className="max-w-4xl mx-auto">
        <p className="text-center text-white/30 text-sm uppercase tracking-widest mb-10">
          Grow across every major platform
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          {platforms.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 text-white/50 hover:text-white/80 transition-colors">
              <p.icon className={`w-5 h-5 ${p.color}`} />
              <span className="text-sm font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="bg-[#0d0d14] py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />
          <div className="relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 rounded-3xl p-12">
            <Badge className="mb-6 bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/20">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Start Growing Today
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Your audience won't grow itself.{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Let the engine do it.
              </span>
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">
              Set up in minutes. Free forever on the starter plan. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-xl shadow-violet-500/30 px-10 h-13 text-base font-semibold"
                onClick={onLogin}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white h-13 px-8 text-base bg-transparent">
                  View Pricing
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">Growth Engine</span>
          </div>

          <div className="flex items-center gap-8">
            {["Features", "How It Works", "Pricing"].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-white/40 hover:text-white/70 transition-colors">
                {link}
              </a>
            ))}
          </div>

          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} Growth Engine. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users straight to the dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Nav onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Pricing onLogin={handleLogin} />
      <FinalCTA onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
