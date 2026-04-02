import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Accounts from "./pages/Accounts";
import Campaigns from "./pages/Campaigns";
import Discovery from "./pages/Discovery";
import EngagementQueue from "./pages/EngagementQueue";
import Analytics from "./pages/Analytics";
import Schedules from "./pages/Schedules";
import Billing from "./pages/Billing";
import Team from "./pages/Team";
import Help from "@/pages/Help";
import Referrals from "@/pages/Referrals";
import { SupportChat } from "./components/SupportChat";
import BillingSuccess from "./pages/BillingSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import OnboardingWizard from "./components/OnboardingWizard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import { useState, useEffect } from "react";

// Onboarding gate — shows wizard on first login for authenticated users
function OnboardingGate() {
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [, navigate] = useLocation();

  const { data: onboardingStatus } = trpc.onboarding.getStatus.useQuery(undefined, {
    enabled: !!user,
    staleTime: Infinity, // only fetch once per session
  });

  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.completed) {
      setShowWizard(true);
    }
  }, [onboardingStatus]);

  const handleComplete = () => {
    setShowWizard(false);
    navigate("/dashboard");
  };

  if (!user) return null;

  return (
    <OnboardingWizard
      open={showWizard}
      onComplete={handleComplete}
    />
  );
}

// All authenticated dashboard routes wrapped in DashboardLayout
function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Home} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/discovery" component={Discovery} />
        <Route path="/queue" component={EngagementQueue} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/schedules" component={Schedules} />
        <Route path="/billing" component={Billing} />
        <Route path="/billing/success" component={BillingSuccess} />
        <Route path="/team" component={Team} />
        <Route path="/help" component={Help} />
        <Route path="/referrals" component={Referrals} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// Top-level router: public landing page at /, everything else through dashboard
function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" />
          <Router />
          <SupportChat />
          <OnboardingGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
