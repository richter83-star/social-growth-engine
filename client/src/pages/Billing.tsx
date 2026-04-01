import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check, Zap, Building2, Sparkles, ExternalLink, CreditCard,
  AlertTriangle, RefreshCw, XCircle, CalendarX,
} from "lucide-react";
import { useLocation } from "wouter";

const PLANS = [
  {
    key: "free" as const,
    name: "Free",
    price: 0,
    description: "Get started with one campaign",
    icon: Sparkles,
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    features: [
      "1 campaign",
      "50 threads / month",
      "2 social accounts",
      "Manual discovery only",
      "Engagement queue",
      "Basic analytics",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: 49,
    description: "For serious growth operators",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    popular: true,
    features: [
      "5 campaigns",
      "Unlimited threads",
      "10 social accounts",
      "Automated scheduling",
      "Up to 5 schedules per campaign",
      "Full analytics & ROI tracking",
      "Priority AI generation",
    ],
    cta: "Upgrade to Pro",
    disabled: false,
  },
  {
    key: "agency" as const,
    name: "Agency",
    price: 149,
    description: "Unlimited scale for agencies",
    icon: Building2,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    features: [
      "Unlimited campaigns",
      "Unlimited threads",
      "Unlimited social accounts",
      "Unlimited schedules",
      "Full analytics & ROI tracking",
      "White-label ready",
      "Priority support",
    ],
    cta: "Upgrade to Agency",
    disabled: false,
  },
];

const PLAN_LOSS_WARNINGS: Record<string, string[]> = {
  pro: [
    "Automated scheduling will stop",
    "Campaigns beyond 1 will be paused",
    "Social accounts beyond 2 will be disconnected",
    "Priority AI generation disabled",
  ],
  agency: [
    "All campaigns beyond 1 will be paused",
    "All social accounts beyond 2 will be disconnected",
    "Automated scheduling will stop",
    "White-label features disabled",
  ],
};

export default function Billing() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);

  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const sub = subData as {
    plan?: string;
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | Date | null;
  } | undefined;
  const currentPlan = sub?.plan ?? "free";
  const isCanceling = sub?.cancelAtPeriodEnd === true;
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to Stripe checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const createPortal = trpc.billing.createPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription scheduled for cancellation. You'll keep access until the end of your billing period.");
      utils.billing.getSubscription.invalidate();
      setShowCancelDialog(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setShowCancelDialog(false);
    },
  });

  const reactivateSubscription = trpc.billing.reactivateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription reactivated! You're back on track.");
      utils.billing.getSubscription.invalidate();
      setShowReactivateDialog(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setShowReactivateDialog(false);
    },
  });

  useEffect(() => {
    if (location.includes("success=1")) {
      toast.success("Subscription activated! Welcome to your new plan.");
      utils.billing.getSubscription.invalidate();
    } else if (location.includes("canceled=1")) {
      toast.info("Checkout canceled. Your plan was not changed.");
    }
  }, [location]);

  const handleUpgrade = (plan: "pro" | "agency") => {
    createCheckout.mutate({ plan, origin: window.location.origin });
  };

  const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const lossWarnings = PLAN_LOSS_WARNINGS[currentPlan] ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Choose Your Growth Plan
          </h1>
          <p className="text-muted-foreground">
            Start free, scale when you're ready. All plans include the core AI engagement engine.
            Use test card <span className="font-mono text-primary">4242 4242 4242 4242</span> to try Pro or Agency.
          </p>
        </div>

        {/* Current plan banner */}
        {currentPlan !== "free" && (
          <Card className={`max-w-2xl mx-auto ${isCanceling ? "bg-destructive/5 border-destructive/30" : "bg-primary/5 border-primary/20"}`}>
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {isCanceling ? (
                  <CalendarX className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isCanceling ? (
                      <>
                        Your <span className="text-destructive capitalize">{currentPlan}</span> plan cancels on{" "}
                        <span className="text-destructive font-semibold">
                          {periodEnd ? periodEnd.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "end of billing period"}
                        </span>
                      </>
                    ) : (
                      <>You are on the <span className="text-primary capitalize">{currentPlan}</span> plan</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isCanceling
                      ? "You'll retain full access until then. Reactivate anytime to keep your plan."
                      : "Manage billing, invoices, and payment details below."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCanceling ? (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90"
                    onClick={() => setShowReactivateDialog(true)}
                    disabled={reactivateSubscription.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reactivate Plan
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => createPortal.mutate({ origin: window.location.origin })}
                      disabled={createPortal.isPending}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Manage Billing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel Plan
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.key;
            const isPending = createCheckout.isPending && createCheckout.variables?.plan === plan.key;

            return (
              <Card
                key={plan.key}
                className={`relative bg-card border-border flex flex-col ${
                  plan.popular ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge
                      variant="outline"
                      className={`text-xs bg-background ${isCanceling ? "border-destructive text-destructive" : "border-primary text-primary"}`}
                    >
                      {isCanceling ? "Canceling" : "Current Plan"}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                    {plan.price === 0 && <span className="text-muted-foreground text-sm"> forever</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {isCurrentPlan ? (
                      isCanceling ? (
                        <Button
                          className="w-full"
                          onClick={() => setShowReactivateDialog(true)}
                          disabled={reactivateSubscription.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reactivate Plan
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      )
                    ) : plan.key === "free" ? (
                      <Button variant="outline" className="w-full" disabled>
                        Free Forever
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={isPending || createCheckout.isPending}
                      >
                        {isPending ? "Redirecting..." : plan.cta}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card className="bg-card border-border max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel directly from this page at any time. Your plan remains active until the end of the current billing period — no immediate cutoff.",
              },
              {
                q: "What happens to my data when I cancel?",
                a: "All your campaigns, accounts, and history are preserved. You'll simply revert to Free plan limits at the end of the billing period.",
              },
              {
                q: "What payment methods are accepted?",
                a: "All major credit and debit cards via Stripe. No PayPal or crypto at this time.",
              },
              {
                q: "What happens when I hit the Free plan limits?",
                a: "You will see an upgrade prompt when you try to create a second campaign or exceed 50 thread discoveries.",
              },
              {
                q: "Is there a trial period?",
                a: "The Free plan is your trial — use the full engine with one campaign before committing to a paid plan.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-medium text-foreground">{q}</p>
                <p className="text-sm text-muted-foreground mt-1">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Cancel Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-foreground">Cancel {planLabel} Plan?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Your subscription will remain active until{" "}
              <span className="font-semibold text-foreground">
                {periodEnd
                  ? periodEnd.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
                  : "the end of your billing period"}
              </span>
              . After that, you'll revert to the Free plan.
            </DialogDescription>
          </DialogHeader>

          {lossWarnings.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">What you'll lose</p>
              <ul className="space-y-1.5">
                {lossWarnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            You can reactivate your plan at any time before the cancellation date to keep all your features.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelSubscription.isPending}
              className="flex-1 sm:flex-none"
            >
              Keep My Plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelSubscription.mutate()}
              disabled={cancelSubscription.isPending}
              className="flex-1 sm:flex-none"
            >
              {cancelSubscription.isPending ? "Canceling..." : "Yes, Cancel Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reactivate Confirmation Dialog ────────────────────────────────── */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-foreground">Reactivate {planLabel} Plan?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Your subscription will continue without interruption. You'll keep all your{" "}
              <span className="font-semibold text-foreground">{planLabel}</span> features and your next billing date stays the same.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReactivateDialog(false)}
              disabled={reactivateSubscription.isPending}
              className="flex-1 sm:flex-none"
            >
              Not Now
            </Button>
            <Button
              onClick={() => reactivateSubscription.mutate()}
              disabled={reactivateSubscription.isPending}
              className="flex-1 sm:flex-none"
            >
              {reactivateSubscription.isPending ? "Reactivating..." : "Yes, Keep My Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
