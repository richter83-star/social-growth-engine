import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
import { SupportChat } from "./components/SupportChat";

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
        <Route path="/team" component={Team} />
        <Route path="/help" component={Help} />
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
