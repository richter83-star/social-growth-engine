import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquareMore,
  Check,
  X,
  Pencil,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCheck,
  Loader2,
  Shield,
} from "lucide-react";

type QueueItem = {
  id: number;
  generatedComment: string;
  editedContent?: string | null;
  isEdited?: boolean;
  commentTone?: string | null;
  confidenceScore?: number | null;
  aiReasoning?: string | null;
  status: string;
  threadId: number;
  campaignId: number;
  createdAt: Date;
  threadTitle?: string;
  threadUrl?: string;
  platform?: string;
};

const TONE_COLORS: Record<string, string> = {
  helpful: "bg-emerald-500/20 text-emerald-400",
  curious: "bg-sky-500/20 text-sky-400",
  authoritative: "bg-violet-500/20 text-violet-400",
  empathetic: "bg-pink-500/20 text-pink-400",
  analytical: "bg-amber-500/20 text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  posted: "bg-blue-500/20 text-blue-400",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500/20 text-sky-400",
  reddit: "bg-orange-500/20 text-orange-400",
  linkedin: "bg-blue-500/20 text-blue-400",
};

type FilterTab = "all" | "pending" | "approved" | "rejected" | "posted";

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-7 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

type QueueCardPermissions = { canEdit: boolean; canApprove: boolean; canReject: boolean };

function QueueCard({ item, onRefetch, permissions }: { item: QueueItem; onRefetch: () => void; permissions: QueueCardPermissions }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.editedContent ?? item.generatedComment);
  const [showReasoning, setShowReasoning] = useState(false);
  const utils = trpc.useUtils();

  // Keep editText in sync when item changes (e.g. after refetch)
  useEffect(() => {
    setEditText(item.editedContent ?? item.generatedComment);
  }, [item.editedContent, item.generatedComment]);

  const updateMutation = trpc.engagement.updateStatus.useMutation({
    onSuccess: () => {
      utils.engagement.getQueue.invalidate();
      onRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeContent = isEditing ? editText : (item.editedContent ?? item.generatedComment);
  const hasEdits = (item.editedContent ?? item.generatedComment) !== item.generatedComment;
  const charCount = activeContent.length;
  const isPending = item.status === "pending";
  const { canEdit, canApprove, canReject } = permissions;

  function handleApprove() {
    const payload: { id: number; status: "approved"; editedContent?: string } = {
      id: item.id,
      status: "approved",
    };
    // If currently editing, save the edit alongside approval
    if (isEditing && editText !== item.generatedComment) {
      payload.editedContent = editText;
    } else if (item.editedContent) {
      payload.editedContent = item.editedContent;
    }
    updateMutation.mutate(payload);
    toast.success("Comment approved!");
    setIsEditing(false);
  }

  function handleReject() {
    updateMutation.mutate({ id: item.id, status: "rejected" });
    toast.error("Comment rejected.");
  }

  function handleSaveEdit() {
    if (editText.trim().length === 0) {
      toast.error("Comment cannot be empty.");
      return;
    }
    updateMutation.mutate({
      id: item.id,
      status: item.status as "approved" | "rejected" | "posted",
      editedContent: editText,
    });
    setIsEditing(false);
    toast.success("Edit saved.");
  }

  function handleCancelEdit() {
    setEditText(item.editedContent ?? item.generatedComment);
    setIsEditing(false);
  }

  function handleRestoreOriginal() {
    setEditText(item.generatedComment);
    updateMutation.mutate({
      id: item.id,
      status: item.status as "approved" | "rejected" | "posted",
      editedContent: item.generatedComment,
    });
    toast.success("Restored to original AI draft.");
  }

  const isBusy = updateMutation.isPending;

  return (
    <Card className={`bg-card border-border transition-all hover:border-primary/20 ${isEditing ? "border-primary/40 shadow-lg shadow-primary/5" : ""}`}>
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.platform && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${PLATFORM_COLORS[item.platform] ?? "bg-muted text-muted-foreground"}`}>
                  {item.platform}
                </span>
              )}
              {item.commentTone && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TONE_COLORS[item.commentTone] ?? "bg-muted text-muted-foreground"}`}>
                  {item.commentTone}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground"}`}>
                {item.status}
              </span>
              {hasEdits && !isEditing && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                  <Pencil className="h-2.5 w-2.5" /> Edited
                </span>
              )}
            </div>
            {item.threadTitle && (
              <p className="text-sm text-muted-foreground truncate">
                Re: <span className="text-foreground/80">{item.threadTitle}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.threadUrl && (
              <a href={item.threadUrl} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
            {isPending && !isEditing && canEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => setIsEditing(true)}
                disabled={isBusy}
                title="Edit comment"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Confidence score */}
        {item.confidenceScore != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Confidence
              </span>
            </div>
            <ConfidenceBar score={item.confidenceScore} />
          </div>
        )}

        {/* Comment content — editable or read-only */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isEditing ? "Editing Comment" : hasEdits ? "Your Edited Version" : "AI Draft"}
            </span>
            {hasEdits && !isEditing && (
              <button
                onClick={handleRestoreOriginal}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                disabled={isBusy}
              >
                <RotateCcw className="h-3 w-3" /> Restore original
              </button>
            )}
          </div>

          {isEditing && canEdit ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                className="bg-input border-primary/40 text-foreground placeholder:text-muted-foreground resize-none focus:ring-1 focus:ring-primary/60 text-sm leading-relaxed"
                placeholder="Edit the AI-generated comment..."
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs tabular-nums ${charCount > 280 ? "text-red-400" : "text-muted-foreground"}`}>
                  {charCount} characters{charCount > 280 ? " (Twitter limit exceeded)" : ""}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs" disabled={isBusy}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs gap-1" disabled={isBusy || editText.trim().length === 0}>
                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-lg p-3.5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap border transition-colors ${
                isPending && canEdit
                  ? "bg-muted/40 border-border hover:border-primary/30 hover:bg-muted/60 cursor-text"
                  : "bg-muted/20 border-transparent cursor-default"
              }`}
              onClick={() => isPending && canEdit && setIsEditing(true)}
              title={isPending && canEdit ? "Click to edit" : undefined}
            >
              {activeContent}
              {isPending && canEdit && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground/60">
                  <Pencil className="h-2.5 w-2.5" /> click to edit
                </span>
              )}
            </div>
          )}

          {/* Show original AI draft when edited */}
          {hasEdits && !isEditing && (
            <div className="rounded-lg p-3 bg-muted/20 border border-dashed border-border/60">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Original AI draft
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{item.generatedComment}</p>
            </div>
          )}
        </div>

        {/* AI Reasoning (collapsible) */}
        {item.aiReasoning && (
          <div>
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              AI reasoning
            </button>
            {showReasoning && (
              <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/40">
                {item.aiReasoning}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {isPending && !isEditing && (canApprove || canReject) && (
          <div className="flex gap-2 pt-1">
            {canApprove && (
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
                onClick={handleApprove}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={handleReject}
                disabled={isBusy}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            )}
          </div>
        )}
        {isPending && !isEditing && !canApprove && !canReject && (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-dashed border-border/60">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            You have view-only access. Contact your workspace owner to approve or reject comments.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EngagementQueue() {
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const utils = trpc.useUtils();
  const { data: myPerms } = trpc.team.getMyPermissions.useQuery();
  const permissions: QueueCardPermissions = {
    canEdit: myPerms?.canEdit ?? true,
    canApprove: myPerms?.canApprove ?? true,
    canReject: myPerms?.canReject ?? true,
  };

  const { data: allItems, isLoading, refetch } = trpc.engagement.getQueue.useQuery(
    { status: activeTab === "all" ? undefined : activeTab },
    { refetchInterval: 15_000 }
  );

  const { data: pendingItems } = trpc.engagement.getQueue.useQuery({ status: "pending" });
  const pendingCount = pendingItems?.length ?? 0;

  const bulkApproveMutation = trpc.engagement.bulkApprove.useMutation({
    onSuccess: (result) => {
      utils.engagement.getQueue.invalidate();
      toast.success(`${result.approved} comment${result.approved !== 1 ? "s" : ""} approved!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "posted", label: "Posted" },
    { key: "all", label: "All" },
  ];

  const items = allItems ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareMore className="h-6 w-6 text-primary" />
            Engagement Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review, edit, and approve AI-generated comments before they go live
          </p>
        </div>
        {pendingCount > 0 && permissions.canApprove && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400 shrink-0"
            onClick={() => {
              const ids = (pendingItems ?? []).map((i) => i.id);
              bulkApproveMutation.mutate({ ids });
            }}
            disabled={bulkApproveMutation.isPending}
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Approve All ({pendingCount})
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg border border-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Queue items */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="p-5 h-48" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquareMore className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {activeTab === "pending" ? "Queue is empty" : `No ${activeTab} comments`}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {activeTab === "pending"
                ? "Run discovery on a campaign to generate AI-powered comments for review."
                : `Comments with "${activeTab}" status will appear here.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <QueueCard
              key={item.id}
              item={item as QueueItem}
              onRefetch={() => refetch()}
              permissions={permissions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
