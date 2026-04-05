import PublicPageLayout from "@/components/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const posts = [
  {
    slug: "how-to-grow-twitter-followers",
    title: "How to Grow Twitter Followers Fast in 2026",
    excerpt: "Proven strategies for growing your Twitter audience using AI engagement, keyword targeting, and consistent posting habits.",
    date: "2026-04-03",
    readTime: "6 min read",
    tag: "Twitter Growth",
  },
  {
    slug: "linkedin-engagement-tips",
    title: "LinkedIn Engagement Tips That Actually Work",
    excerpt: "Stop posting into the void. Here are the LinkedIn engagement tactics that drive real profile visits and connection requests.",
    date: "2026-04-01",
    readTime: "5 min read",
    tag: "LinkedIn",
  },
  {
    slug: "social-media-automation-guide",
    title: "The Complete Guide to Social Media Automation",
    excerpt: "Everything you need to know about automating your social media engagement safely — without getting your accounts banned.",
    date: "2026-03-28",
    readTime: "8 min read",
    tag: "Automation",
  },
  {
    slug: "instagram-growth-strategy",
    title: "Instagram Growth Strategy for 2026",
    excerpt: "How to grow your Instagram following organically using AI-powered engagement, niche targeting, and consistent content strategy.",
    date: "2026-03-25",
    readTime: "7 min read",
    tag: "Instagram",
  },
  {
    slug: "ai-social-media-tools",
    title: "Best AI Social Media Tools for Creators and Startups",
    excerpt: "A comprehensive review of the best AI-powered social media tools available in 2026 — and how to choose the right one for your goals.",
    date: "2026-03-20",
    readTime: "9 min read",
    tag: "AI Tools",
  },
];

export default function Blog() {
  return (
    <PublicPageLayout>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
        <Badge className="mb-6 bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/10">Blog</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Social Media Growth{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Insights & Guides</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Actionable tips, strategies, and guides for growing your social media audience with AI.
        </p>
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-6">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 hover:bg-white/[0.07] transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-xs hover:bg-violet-500/10">{post.tag}</Badge>
                  <span className="text-xs text-white/40">{post.date}</span>
                  <span className="text-xs text-white/40">·</span>
                  <span className="text-xs text-white/40">{post.readTime}</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">{post.title}</h2>
                <p className="text-white/60 text-sm leading-relaxed">{post.excerpt}</p>
                <p className="text-violet-400 text-sm mt-4 font-medium">Read more →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicPageLayout>
  );
}
