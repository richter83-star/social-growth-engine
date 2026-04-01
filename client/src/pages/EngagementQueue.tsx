import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquareMore, CheckCircle, XCircle, Send, Bot, Loader2, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-blue-500/20 text-blue-400",
  rejected: "bg-red-500/20 text-red-400",
  posted: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-muted text-muted-foreground",
};

const TONE_COLORS: Record<string, string> = {
  helpful: "bg-emerald-500/10 text-emerald-400",
  insightful: "bg-blue-500/10 text-blue-400",
  empathetic: "bg-violet-500/10 text-violet-400",
  educational: "bg-amber-500/10 text-amber-400",
  conversational: "bg-teal-500/10 text-teal-400",
};

export default function EngagementQueue() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: queue, isLoading } = trpc.engagement.getQueue.useQuery({ status: statusFilter || undefined });

  const updateMutation = trpc.engagement.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      utils.engagement.getQueue.invalidate();
      utils.analytics.summary.invalidate();
      utils.notifications.list.invalidate();
      const messages: Record<string, string> = {
        approved: "Comment approved!",
        rejected: "Comment rejected",
        posted: "Comment marked as posted!",
      };
      toast.success(messages[vars.status] ?? "Updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkApproveMutation = trpc.engagement.bulkApprove.useMutation({
    onSuccess: (data) => {
      utils.engagement.getQueue.invalidate();
      toast.success(`${data.approved} comments approved!`);
    },
  });

  const pendingItems = queue?.filter((q) => q.status === "pending") ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareMore className="h-6 w-6 text-primary" />
            Engagement Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and approve AI-generated comments before they go live
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-input border-border text-foreground">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {pendingItems.length > 1 && (
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              disabled={bulkApproveMutation.isPending}
              onClick={() => bulkApproveMutation.mutate({ ids: pendingItems.map((q) => q.id) })}
            >
              <CheckCircle className="h-4 w-4" />
              Approve All ({pendingItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending", status: "pending", color: "text-amber-400" },
          { label: "Approved", status: "approved", color: "text-blue-400" },
          { label: "Posted", status: "posted", color: "text-emerald-400" },
          { label: "Rejected", status: "rejected", color: "text-red-400" },
        ].map((s) => {
          const { data: statusData } = trpc.engagement.getQueue.useQuery({ status: s.status });
          return (
            <Card key={s.status} className={`bg-card border-border cursor-pointer hover:border-primary/30 transition-all ${statusFilter === s.status ? "border-primary/50" : ""}`} onClick={() => setStatusFilter(s.status)}>
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{statusData?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Queue Items */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground capitalize">
            {statusFilter} Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />)}
            </div>
          ) : !queue || queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No {statusFilter} comments</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                {statusFilter === "pending"
                  ? "Discover threads and generate AI comments to populate the queue."
                  : `No ${statusFilter} comments yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/20 transition-all">
                  {/* Comment */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[item.status]}`}>
                          {item.status}
                        </span>
                        {item.commentTone && (
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TONE_COLORS[item.commentTone] ?? "bg-muted text-muted-foreground"}`}>
                            {item.commentTone}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Confidence: <span className="text-foreground font-medium">{item.confidenceScore?.toFixed(1)}/10</span>
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{item.generatedComment}</p>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  {item.aiReasoning && (
                    <div className="ml-11 mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-primary font-medium">AI Reasoning: </span>
                        {item.aiReasoning}
                      </p>
                    </div>
                  )}

                  {/* Confidence Bar */}
                  <div className="ml-11 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${((item.confidenceScore ?? 0) / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {item.status === "pending" && (
                    <div className="ml-11 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: item.id, status: "approved" })}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: item.id, status: "rejected" })}
                      >
                        <XCircle className="h-3.5 w-3.5" />Reject
                      </Button>
                    </div>
                  )}
                  {item.status === "approved" && (
                    <div className="ml-11 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: item.id, status: "posted" })}
                      >
                        <Send className="h-3.5 w-3.5" />Mark as Posted
                      </Button>
                    </div>
                  )}
                  {item.status === "posted" && item.postedAt && (
                    <div className="ml-11">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Send className="h-3 w-3 text-emerald-400" />
                        Posted {new Date(item.postedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="ml-11 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
