/**
 * InstagramPanel
 *
 * Displays live stats for the owner's connected Instagram account
 * via the MCP connector. Shown on the Accounts page.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, BarChart2, Image, Users, Heart, MessageCircle, Eye } from "lucide-react";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

function StatBox({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="text-center p-3 rounded-xl bg-muted/40 flex flex-col items-center gap-1">
      <Icon className="h-4 w-4 text-pink-400 mb-0.5" />
      <p className="text-lg font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function InstagramPanel() {
  const [expanded, setExpanded] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const {
    data: accountInfo,
    isLoading: loadingAccount,
    refetch: refetchAccount,
    isFetching: fetchingAccount,
  } = trpc.instagramMcp.accountInfo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const {
    data: posts,
    isLoading: loadingPosts,
    refetch: refetchPosts,
  } = trpc.instagramMcp.posts.useQuery(
    { limit: 10 },
    { enabled: expanded, staleTime: 5 * 60 * 1000 }
  );

  const {
    data: postInsights,
    isLoading: loadingInsights,
  } = trpc.instagramMcp.postInsights.useQuery(
    { postId: selectedPostId! },
    { enabled: !!selectedPostId, staleTime: 5 * 60 * 1000 }
  );

  const handleRefresh = () => {
    refetchAccount();
    if (expanded) refetchPosts();
  };

  return (
    <Card className="bg-card border-border border-pink-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-pink-400 bg-pink-500/10">
              <InstagramIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                Instagram — Live Stats
                <Badge className="text-[10px] px-1.5 py-0 bg-pink-500/20 text-pink-300 border-0">MCP Connected</Badge>
              </CardTitle>
              {accountInfo ? (
                <p className="text-xs text-muted-foreground">@{accountInfo.username} · {accountInfo.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">FriedFeeds creator account</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10"
              onClick={handleRefresh}
              disabled={fetchingAccount}
            >
              <RefreshCw className={`h-4 w-4 ${fetchingAccount ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadingAccount ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : accountInfo ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Followers" value={accountInfo.followers} icon={Users} />
              <StatBox label="Following" value={accountInfo.following} icon={Users} />
              <StatBox label="Posts" value={accountInfo.posts} icon={Image} />
            </div>

            {/* Expand to see posts */}
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 gap-1.5"
                onClick={() => setExpanded(!expanded)}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                {expanded ? "Hide post insights" : "View post insights"}
              </Button>
            </div>

            {expanded && (
              <div className="space-y-3 pt-1">
                {loadingPosts ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted/40" />)}
                  </div>
                ) : !posts || posts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No posts found on this account yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Posts</p>
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPostId === post.id
                            ? "border-pink-500/40 bg-pink-500/5"
                            : "border-border/50 bg-muted/20 hover:border-pink-500/20 hover:bg-pink-500/5"
                        }`}
                        onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-pink-500/30 text-pink-400 capitalize">
                              {post.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {post.caption ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "") : "No caption"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {post.timestamp && (
                              <span className="text-[10px] text-muted-foreground/60">
                                {new Date(post.timestamp).toLocaleDateString()}
                              </span>
                            )}
                            {post.permalink && (
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-pink-400"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Inline insights for selected post */}
                        {selectedPostId === post.id && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            {loadingInsights ? (
                              <div className="flex gap-3 animate-pulse">
                                {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-16 rounded bg-muted/40" />)}
                              </div>
                            ) : postInsights ? (
                              <div className="grid grid-cols-4 gap-2">
                                {postInsights.likes !== undefined && (
                                  <div className="text-center">
                                    <Heart className="h-3.5 w-3.5 text-pink-400 mx-auto mb-0.5" />
                                    <p className="text-sm font-semibold text-foreground">{postInsights.likes.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">Likes</p>
                                  </div>
                                )}
                                {postInsights.comments !== undefined && (
                                  <div className="text-center">
                                    <MessageCircle className="h-3.5 w-3.5 text-blue-400 mx-auto mb-0.5" />
                                    <p className="text-sm font-semibold text-foreground">{postInsights.comments.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">Comments</p>
                                  </div>
                                )}
                                {postInsights.reach !== undefined && (
                                  <div className="text-center">
                                    <Eye className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-0.5" />
                                    <p className="text-sm font-semibold text-foreground">{postInsights.reach.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">Reach</p>
                                  </div>
                                )}
                                {postInsights.impressions !== undefined && (
                                  <div className="text-center">
                                    <BarChart2 className="h-3.5 w-3.5 text-violet-400 mx-auto mb-0.5" />
                                    <p className="text-sm font-semibold text-foreground">{postInsights.impressions.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">Impressions</p>
                                  </div>
                                )}
                                {postInsights.saved !== undefined && (
                                  <div className="text-center">
                                    <p className="text-sm font-semibold text-foreground">{postInsights.saved.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">Saved</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No insights available for this post.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <InstagramIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Could not load Instagram stats.</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        <div className="pt-1 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            Connected via MCP · @friedfeeds1 · Data refreshes on demand
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
