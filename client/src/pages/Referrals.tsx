/**
 * Referrals Page
 *
 * Shows the user's personal referral code, stats, share buttons,
 * and a leaderboard of top referrers.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy, Check, Twitter, Linkedin, Gift, Trophy, Users, TrendingUp, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function Referrals() {
  const [copied, setCopied] = useState(false);

  const { data: myCode, isLoading } = trpc.referrals.getMyCode.useQuery();
  const { data: referralList } = trpc.referrals.getReferralList.useQuery();
  const { data: leaderboard } = trpc.referrals.getLeaderboard.useQuery();

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I've been using Growth Engine to automate my social media engagement — it's genuinely good. Try it free with my code ${myCode?.code}: ${myCode?.referralUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(myCode?.referralUrl ?? "");
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift className="h-6 w-6 text-violet-400" />
          Refer & Earn
        </h1>
        <p className="text-muted-foreground mt-1">
          Share Growth Engine with your network. For every paying customer you refer, you get one month free.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Referrals</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{myCode?.totalReferrals ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Converted</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{myCode?.convertedReferrals ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Credits Earned</span>
            </div>
            <p className="text-3xl font-bold text-violet-400">{myCode?.creditsEarned ?? 0}</p>
            <p className="text-xs text-muted-foreground">free months</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral link card */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Code */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-background/50 rounded-lg px-4 py-3 border border-border/50">
              <code className="text-lg font-mono font-bold text-cyan-400 tracking-widest">
                {myCode?.code ?? "Loading..."}
              </code>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs ml-auto">
                1 month free per referral
              </Badge>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(myCode?.code ?? "")}
              className="shrink-0 border-border/50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Full URL */}
          <div className="flex items-center gap-2 bg-background/30 rounded-lg px-3 py-2 border border-border/30">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {myCode?.referralUrl ?? ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => handleCopy(myCode?.referralUrl ?? "")}
            >
              Copy URL
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
              onClick={shareOnTwitter}
            >
              <Twitter className="h-3.5 w-3.5" />
              Share on X
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={shareOnLinkedIn}
            >
              <Linkedin className="h-3.5 w-3.5" />
              Share on LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Referral history */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {!referralList || referralList.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No referrals yet</p>
                <p className="text-xs text-muted-foreground mt-1">Share your link to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referralList.map((ref, i) => (
                  <div key={ref.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        ref.status === "converted"
                          ? "bg-emerald-500/20 text-emerald-300 border-0"
                          : "bg-amber-500/20 text-amber-300 border-0"
                      }
                    >
                      {ref.status === "converted" ? "Converted" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Leaderboard is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to refer someone!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                        i === 1 ? "bg-slate-400/20 text-slate-300" :
                        i === 2 ? "bg-orange-600/20 text-orange-400" :
                        "bg-muted/30 text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">{entry.converted}</p>
                        <p className="text-xs text-muted-foreground">converted</p>
                      </div>
                    </div>
                    {i < leaderboard.length - 1 && <Separator className="mt-3 bg-border/30" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { step: "1", title: "Share your link", desc: "Send your referral URL or code to anyone who might benefit from Growth Engine." },
              { step: "2", title: "They sign up", desc: "Your referral signs up using your link. Their account is automatically linked to you." },
              { step: "3", title: "You get a free month", desc: "When they subscribe to any paid plan, you receive one month free on your current plan." },
            ].map(item => (
              <div key={item.step} className="text-center p-4 rounded-xl bg-muted/20">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 font-bold text-sm flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
