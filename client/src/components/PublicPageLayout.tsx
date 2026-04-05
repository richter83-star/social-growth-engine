import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, Menu, X, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

function PublicNav() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogin = () => {
    if (user) navigate("/dashboard");
    else window.location.href = getLoginUrl();
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Growth Engine</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm text-white/70 hover:text-white transition-colors">Features</a>
          <a href="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">Pricing</a>
          <a href="/blog" className="text-sm text-white/70 hover:text-white transition-colors">Blog</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={handleLogin}>
            {user ? "Dashboard" : "Log in"}
          </Button>
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-violet-500/25" onClick={handleLogin}>
            Start Free
          </Button>
        </div>
        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0f]/98 border-b border-white/10 px-6 py-4 flex flex-col gap-4">
          <a href="/#features" className="text-sm text-white/70 hover:text-white" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="/pricing" className="text-sm text-white/70 hover:text-white" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="/blog" className="text-sm text-white/70 hover:text-white" onClick={() => setMenuOpen(false)}>Blog</a>
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 w-full" onClick={handleLogin}>
            Start Free
          </Button>
        </div>
      )}
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f] py-12 mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white">Growth Engine</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">AI-powered social media growth for creators, startups, and agencies.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Product</p>
            <div className="flex flex-col gap-2">
              {[["Features", "/features"], ["Pricing", "/pricing"], ["Integrations", "/integrations"]].map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-white/50 hover:text-white/80 transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Use Cases</p>
            <div className="flex flex-col gap-2">
              {[["For Startups", "/for-startups"], ["For Agencies", "/for-agencies"], ["For Creators", "/for-creators"]].map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-white/50 hover:text-white/80 transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Company</p>
            <div className="flex flex-col gap-2">
              {[["About", "/about"], ["Blog", "/blog"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-white/50 hover:text-white/80 transition-colors">{label}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Social Growth Engine. All rights reserved.</p>
          <p className="text-xs text-white/40">Made with AI-powered growth in mind.</p>
        </div>
      </div>
    </footer>
  );
}

interface PublicPageLayoutProps {
  children: React.ReactNode;
  /** Optional back link shown below the nav */
  backHref?: string;
  backLabel?: string;
}

export default function PublicPageLayout({ children, backHref, backLabel }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />
      {backHref && (
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-0">
          <a href={backHref} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel ?? "Back"}
          </a>
        </div>
      )}
      <main className={backHref ? "pt-4" : "pt-16"}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
