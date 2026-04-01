import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Zap, Building2, Sparkles, ExternalLink, CreditCard } from "lucide-react";
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

export default function Billing() {
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const currentPlan = (subData as { plan?: string })?.plan ?? "free";

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
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (e) => toast.error(e.message),
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
          <Card className="bg-primary/5 border-primary/20 max-w-2xl mx-auto">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    You are on the <span className="text-primary capitalize">{currentPlan}</span> plan
                  </p>
                  <p className="text-xs text-muted-foreground">Manage billing, invoices, and cancellation below.</p>
                </div>
              </div>
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
                    <Badge variant="outline" className="border-primary text-primary bg-background text-xs">
                      Current Plan
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
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
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
                a: "Yes. Cancel from the billing portal at any time. Your plan remains active until the end of the billing period.",
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
    </DashboardLayout>
  );
}
