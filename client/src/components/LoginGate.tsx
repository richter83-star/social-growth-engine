import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Zap, Shield, TrendingUp, Users, Bot, BarChart3 } from "lucide-react";

const features = [
  { icon: Bot, label: "AI-Powered Discovery", desc: "Find high-intent conversations automatically" },
  { icon: TrendingUp, label: "Growth Analytics", desc: "Track follower growth and engagement ROI" },
  { icon: Users, label: "Multi-Account Management", desc: "Manage all your social profiles in one place" },
  { icon: BarChart3, label: "Campaign Automation", desc: "Schedule and automate your engagement strategy" },
];

/**
 * Full-screen enterprise login gate.
 * Shown whenever an unauthenticated user tries to access a protected route.
 */
export function LoginGate() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left panel — branding & feature list */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Growth Engine</span>
        </div>

        {/* Tagline */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Autonomous social growth,<br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                powered by AI.
              </span>
            </h2>
            <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
              Discover high-intent conversations, generate context-aware engagement,
              and track your growth — all on autopilot.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-2 text-xs text-white/30">
          <Shield className="w-3.5 h-3.5" />
          <span>Enterprise-grade security · SOC 2 compliant infrastructure</span>
        </div>
      </div>

      {/* Right panel — login card */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Growth Engine</span>
          </div>

          {/* Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl shadow-black/40">
            <div className="space-y-2 mb-8">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-white/50 text-sm">
                Sign in to access your Growth Engine dashboard.
              </p>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25 font-semibold text-sm transition-all duration-200"
            >
              Continue with Manus
            </Button>

            <p className="mt-6 text-center text-xs text-white/30">
              By signing in, you agree to our{" "}
              <a href="#" className="underline underline-offset-2 hover:text-white/60 transition-colors">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline underline-offset-2 hover:text-white/60 transition-colors">
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* Back to landing */}
          <p className="text-center text-sm text-white/40">
            New here?{" "}
            <a
              href="/"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Learn more about Growth Engine →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
