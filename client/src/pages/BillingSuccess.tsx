import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Zap, Users, BarChart3, Calendar, ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Confetti ──────────────────────────────────────────────────────────────────
type Particle = {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; rotationSpeed: number; opacity: number;
};

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#ffffff"];

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
      opacity: 1,
    }));

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height * 0.7) p.opacity -= 0.02;
        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canvasRef]);
}

// ── Plan metadata ─────────────────────────────────────────────────────────────
const PLAN_META: Record<string, {
  label: string;
  color: string;
  gradient: string;
  features: string[];
}> = {
  pro: {
    label: "Pro",
    color: "text-violet-400",
    gradient: "from-violet-600 to-violet-800",
    features: [
      "5 active campaigns",
      "Unlimited thread discovery",
      "5 connected social accounts",
      "Priority AI processing",
      "Priority support",
    ],
  },
  agency: {
    label: "Agency",
    color: "text-cyan-400",
    gradient: "from-cyan-600 to-violet-700",
    features: [
      "Unlimited campaigns",
      "Unlimited thread discovery",
      "Unlimited social accounts",
      "Team collaboration & permissions",
      "White-label ready",
      "Dedicated support",
    ],
  },
};

// ── Onboarding steps ──────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Users,
    title: "Connect a social account",
    description: "Link your Twitter/X, LinkedIn, Reddit, Instagram, or TikTok profile.",
    href: "/accounts",
    cta: "Go to Accounts",
  },
  {
    icon: Zap,
    title: "Create your first campaign",
    description: "Set keywords, choose platforms, and define your brand persona.",
    href: "/campaigns",
    cta: "Create Campaign",
    primary: true,
  },
  {
    icon: BarChart3,
    title: "Run discovery & review queue",
    description: "Let AI find high-intent threads and draft comments for your approval.",
    href: "/discovery",
    cta: "Start Discovery",
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingSuccess() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useConfetti(canvasRef);

  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Read plan from URL query param (?plan=pro or ?plan=agency)
  const params = new URLSearchParams(window.location.search);
  const planKey = (params.get("plan") ?? "pro") as keyof typeof PLAN_META;
  const plan = PLAN_META[planKey] ?? PLAN_META.pro;

  // Fetch live subscription to confirm it's active
  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const sub = subData as (typeof subData & { currentPeriodEnd?: Date | null }) | undefined;

  // Animated counter for "days free trial" or just a welcome delay
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#080812] text-white relative overflow-hidden">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        aria-hidden="true"
      />

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-600/8 blur-[100px]" />
      </div>

      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

        {/* Success icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/40">
            <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-3 tracking-tight">
          Welcome to{" "}
          <span className={`bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
            Growth Engine {plan.label}
          </span>
          , {firstName}!
        </h1>
        <p className="text-white/50 text-lg text-center max-w-md mb-10">
          Your subscription is active. You're now ready to grow your social media presence on autopilot.
        </p>

        {/* Plan confirmation card */}
        <div className={`w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 mb-10 backdrop-blur-sm`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${plan.gradient} text-white`}>
              {plan.label} Plan
            </div>
            <span className="text-white/40 text-sm">Active</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">Live</span>
            </div>
          </div>
          <ul className="space-y-2">
            {plan.features.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {(sub as { currentPeriodEnd?: Date | null } | undefined)?.currentPeriodEnd && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/40 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              Next billing date: {new Date((sub as { currentPeriodEnd?: Date | null }).currentPeriodEnd!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </div>
          )}
        </div>

        {/* Onboarding steps */}
        <div className="w-full max-w-2xl mb-10">
          <h2 className="text-center text-white/60 text-sm font-semibold uppercase tracking-widest mb-5">
            Get started in 3 steps
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Link key={step.href} href={step.href}>
                  <div className={`
                    group relative rounded-xl p-5 border cursor-pointer transition-all duration-200
                    ${step.primary
                      ? "border-violet-500/50 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-500/70"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                    }
                  `}>
                    {/* Step number */}
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-3
                      ${step.primary ? "bg-violet-500 text-white" : "bg-white/10 text-white/50"}
                    `}>
                      {i + 1}
                    </div>
                    <Icon className={`w-5 h-5 mb-2 ${step.primary ? "text-violet-400" : "text-white/40"}`} />
                    <h3 className="text-white text-sm font-semibold mb-1">{step.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed mb-3">{step.description}</p>
                    <span className={`text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all ${step.primary ? "text-violet-400" : "text-white/40"}`}>
                      {step.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold px-8 shadow-lg shadow-violet-500/30 border-0"
            onClick={() => navigate("/campaigns")}
          >
            <Zap className="w-4 h-4 mr-2" />
            Create Your First Campaign
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="text-white/50 hover:text-white hover:bg-white/5"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-white/25 text-xs text-center max-w-sm">
          A confirmation email has been sent to {user?.email ?? "your inbox"}.
          Questions? Click the chat bubble in the bottom-right corner.
        </p>
      </div>
    </div>
  );
}
