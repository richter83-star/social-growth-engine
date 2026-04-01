# Social Growth Engine - TODO

## Database & Schema
- [x] Social accounts table (multi-account management)
- [x] Campaigns table (keywords, platforms, persona, status)
- [x] Discovered threads table (platform, url, title, intent score)
- [x] Engagement queue table (AI-generated comments, status: pending/approved/rejected/posted)
- [x] Performance metrics table (follower counts, engagement rates, daily snapshots)
- [x] Notifications table (alerts for high-value threads, campaign completions)

## Backend (tRPC Routers)
- [x] accounts router: CRUD for social media accounts with encrypted credentials
- [x] campaigns router: create, update, delete, start/stop campaigns
- [x] discovery router: run thread discovery using SocialMonitorService + StealthBrowser simulation
- [x] engagement router: generate AI comments, approve/reject queue items
- [x] analytics router: fetch metrics, growth trends, ROI data
- [x] notifications router: list and mark-read notifications

## Frontend Pages
- [x] Dashboard home: overview cards (accounts, campaigns, threads, queue)
- [x] Accounts page: add/remove social accounts, view connection status
- [x] Campaigns page: create/edit campaigns with keyword + platform + persona config
- [x] Discovery page: real-time thread discovery feed with intent scores
- [x] Engagement Queue page: approve/reject AI-generated comments
- [x] Analytics page: charts for follower growth, engagement rate, ROI over time
- [x] Notifications panel: alert feed in sidebar (in Overview page)

## AI Engine
- [x] Thread discovery simulation (SocialMonitorService integration)
- [x] Context-aware comment generation (swarm agent LLM pipeline)
- [x] Online learning: track engagement outcomes and optimize strategy
- [x] Campaign playbook execution (3-day warmup, direct negotiator)

## UX & Polish
- [x] DashboardLayout with sidebar navigation
- [x] Dark theme with professional color palette
- [x] Real-time metrics refresh
- [x] Loading skeletons and empty states
- [x] Toast notifications for actions
- [x] Responsive design

## Tests
- [x] accounts router tests
- [x] campaigns router tests
- [x] engagement generation tests

## Scheduling System
- [x] Add schedules table to DB schema (campaignId, cronExpression, timezone, isActive, lastRun, nextRun)
- [x] Backend cron engine: node-cron runner that fires discovery jobs on schedule
- [x] schedules tRPC router: CRUD for campaign schedules
- [x] Schedule UI page: create/edit/delete schedules per campaign with cron presets
- [x] Show next run time and last run time in schedule list
- [x] Notify owner when a scheduled discovery run completes

## Stripe Paywall
- [x] Add Stripe via webdev_add_feature
- [x] Add subscriptions table (userId, stripeCustomerId, stripePriceId, status, currentPeriodEnd)
- [x] Stripe checkout session creation (tRPC mutation)
- [x] Stripe webhook handler: handle checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- [x] Pricing page with 3 tiers: Free (1 campaign, 50 threads/mo), Pro ($49/mo, 5 campaigns, unlimited), Agency ($149/mo, unlimited)
- [x] Subscription gating middleware: enforce plan limits on campaign creation and discovery runs
- [x] Billing portal link (Stripe customer portal)
- [x] Show current plan badge in sidebar
- [x] Upgrade prompt when user hits plan limits

## Inline Comment Editor (Engagement Queue)
- [x] Backend: add `editedContent` field to updateEngagementStatus mutation so edits are persisted
- [x] EngagementQueue: inline textarea editor per queue item (click Edit to expand)
- [x] EngagementQueue: character count and Save/Cancel controls on the inline editor
- [x] EngagementQueue: Approve button posts the current content (original or edited)
- [x] EngagementQueue: Reject button with single click
- [x] EngagementQueue: visual indicator showing when content has been edited vs original AI draft
- [x] EngagementQueue: filter tabs — All / Pending / Approved / Rejected
- [x] EngagementQueue: bulk approve all pending items button
- [x] Tests: inline editor mutation test

## Role & Permission System
- [x] DB: add `team_members` table (userId, ownerId, role: owner/editor/reviewer, permissions JSON)
- [x] DB: permissions JSON schema: { canEdit, canApprove, canReject, canDiscover, canManageCampaigns }
- [x] Backend: `teamRouter` — invite member, list members, update role/permissions, remove member
- [x] Backend: permission guard middleware — check user permissions before engagement mutations
- [x] Backend: engagement.updateStatus — gate edit/approve/reject by permission flags
- [x] Backend: `roles.getMyPermissions` — return current user's effective permissions
- [x] Frontend: Role Management page (/team) — list members, assign roles, toggle permissions
- [x] Frontend: Engagement Queue — hide Edit button if canEdit=false
- [x] Frontend: Engagement Queue — hide Approve button if canApprove=false
- [x] Frontend: Engagement Queue — hide Reject button if canReject=false
- [x] Frontend: Show permission-denied toast when action is blocked
- [x] Frontend: Add Team nav item to sidebar
- [x] Tests: permission guard tests (owner can do all, reviewer can only approve/reject, viewer blocked)

## Instagram & TikTok Platform Support
- [x] DB: add `instagram` and `tiktok` to the `platform` enum in `socialAccounts` table
- [x] DB: add `instagram` and `tiktok` to the `platforms` JSON array validation in `campaigns` table
- [x] Backend: update Zod platform enum in accounts.create and campaigns.create procedures
- [x] Frontend: Accounts page — add Instagram and TikTok to platform dropdown with icons
- [x] Frontend: Campaigns page — add Instagram and TikTok to platform multi-select
- [x] Frontend: Discovery page — show Instagram/TikTok platform badges
- [x] Frontend: Accounts page — show correct platform color/icon for Instagram and TikTok cards
- [x] Tests: update platform validation tests to include instagram and tiktok

## FAQ & User Guide
- [x] Help page at /help with tabbed layout: User Guide tab and FAQ tab
- [x] User Guide: step-by-step sections for each major feature (Accounts, Campaigns, Discovery, Queue, Schedules, Billing, Team)
- [x] User Guide: visual step indicators and collapsible sections
- [x] FAQ: 15+ questions covering common use cases, limits, billing, and troubleshooting
- [x] Help link in sidebar navigation
- [x] Search/filter within FAQ

## Regenerate Button & Stripe Secrets
- [x] Backend: add `engagement.regenerate` tRPC mutation that calls the AI engine to produce a new comment for an existing queue item
- [x] EngagementQueue: add Regenerate button (RefreshCw icon) per card — visible on pending items
- [x] EngagementQueue: show loading spinner on the card while regeneration is in progress
- [x] EngagementQueue: replace displayed comment text with the new AI draft on success
- [x] Stripe: set STRIPE_PRICE_PRO and STRIPE_PRICE_AGENCY as secrets
- [x] Tests: add regenerate mutation test

## Demo Video for Landing Page Hero
- [x] Generate reference images (dark SaaS UI, cyberpunk style, purple/blue accents)
- [x] Plan 4 video clips: Discovery scan → Thread selection → AI draft + Approve → Analytics growth
- [x] Generate keyframes (first + last) for all 4 clips
- [x] Generate 4 video clips (clip1: 8s, clip2: 6s, clip3: 8s, clip4: 8s)
- [x] Generate electronic BGM (35s, synthesized upbeat electronic track)
- [x] Assemble final 30s demo video with BGM overlay and audio mixing
- [x] Upload demo video to CDN
- [x] Add DemoModal component to LandingPage.tsx with keyboard close (Escape) and backdrop click
- [x] Add "Watch Demo" button to hero CTA row
- [x] Add autoplay muted video thumbnail preview in hero section with play overlay

## Social Proof Section (Landing Page)
- [x] Add "trusted by X marketers" animated counter bar below hero stats
- [x] Add platform logos strip (Twitter/X, Reddit, LinkedIn, Instagram, TikTok) with "Works with" label
- [x] Add 3 testimonial cards with avatar, name, role, and quote
- [x] Add a "Featured in / As seen on" press logo row (optional polish)
- [x] Ensure section is responsive and matches dark SaaS design language

## Stripe Webhook Verification
- [x] Add a tRPC procedure `billing.testWebhook` that calls the Stripe API to send a test webhook event
- [x] Write vitest test for the webhook handler: verify signature check, test event bypass, and checkout.session.completed processing
- [x] Confirm webhook route is registered at /api/stripe/webhook with raw body parser

## AI Support Chat Widget
- [x] DB: add `support_messages` table (id, userId nullable, sessionId, role: user/assistant, content, createdAt)
- [x] Backend: `support.chat` tRPC mutation — accepts message + history, calls invokeLLM with Growth Engine system prompt, returns AI reply
- [x] Backend: `support.getHistory` tRPC query — returns last 20 messages for current session
- [x] Knowledge base: comprehensive system prompt covering features, pricing, FAQ, troubleshooting
- [x] Frontend: `SupportChat.tsx` floating widget — FAB button (bottom-right), slide-up chat panel
- [x] Frontend: Chat panel — message bubbles, typing indicator, input + send button
- [x] Frontend: Quick-reply chips for common questions (What is Growth Engine? How does pricing work? etc.)
- [x] Frontend: Show on both landing page (unauthenticated) and dashboard (authenticated)
- [x] Frontend: Persist session across page navigations using sessionStorage
- [x] Tests: support.chat mutation test — verify LLM is called with correct system prompt and history

## Post-Checkout Success Page (/billing/success)
- [x] Frontend: BillingSuccess.tsx page — confetti animation, thank-you heading with user name, plan badge
- [x] Frontend: Plan confirmation card showing plan name, key features unlocked, next billing date
- [x] Frontend: 3-step onboarding checklist (Connect account → Create campaign → Run discovery)
- [x] Frontend: Primary CTA "Create Your First Campaign →" linking to /campaigns
- [x] Frontend: Secondary CTA "Go to Dashboard" linking to /dashboard
- [x] Backend: Update Stripe checkout success_url to point to /billing/success?session_id={CHECKOUT_SESSION_ID}
- [x] Route: Register /billing/success in App.tsx inside DashboardRouter
- [x] Tests: BillingSuccess renders correct plan name and CTAs

## Super Admin Dashboard (/admin)
- [x] Backend: adminProcedure guard — only owner (OWNER_OPEN_ID) can access
- [x] Backend: admin.getOverview — total users, MRR, ARR, active subs, churn rate, new signups (7d/30d)
- [x] Backend: admin.getUsers — paginated user list with plan, status, joined date, last active, account count, campaign count, engagement count
- [x] Backend: admin.getUserDetail — single user deep-dive: subscription history, accounts, campaigns, queue stats, support messages
- [x] Backend: admin.getRevenueMetrics — daily/weekly MRR trend, plan distribution (free/pro/agency counts), lifetime value
- [x] Backend: admin.getSupportActivity — recent support chat sessions with message count and last message preview
- [x] Backend: admin.getSystemHealth — DB row counts, scheduler status, queue backlog size
- [x] Backend: admin.updateUserPlan — manually override a user's plan (for comps/refunds)
- [x] Frontend: /admin route — owner-only, redirects non-admins to /dashboard
- [x] Frontend: Admin sidebar with sections: Overview, Customers, Revenue, Support, System
- [x] Frontend: Overview tab — KPI cards (MRR, ARR, total users, active subs, churn), sparkline charts, new signups trend
- [x] Frontend: Customers tab — searchable/sortable table with plan badge, status, joined date, actions (view detail, change plan)
- [x] Frontend: Customer detail drawer — full profile, subscription timeline, connected accounts, campaign list, support history
- [x] Frontend: Revenue tab — MRR trend line chart, plan distribution donut chart, top customers by LTV
- [x] Frontend: Support tab — table of recent support sessions with preview and link to full conversation
- [x] Frontend: System tab — health indicators, DB stats, scheduler status
- [x] Tests: admin procedures return correct data and reject non-admin callers

## New Signup Real-Time Notifications
- [x] Wire notifyOwner into Stripe webhook: checkout.session.completed → owner ping with customer name, email, plan, and MRR impact
- [x] Wire notifyOwner for subscription cancellation events (customer.subscription.deleted) → owner ping with churn alert
- [x] Include plan tier, customer email, and cumulative MRR in the notification body
- [x] Tests: verify notifyOwner is called with correct payload on new paid subscription

## Subscription Cancellation
- [x] Backend: billing.cancelSubscription protectedProcedure — calls Stripe cancelAtPeriodEnd, updates DB status to "canceling", returns updated subscription
- [x] Backend: billing.reactivateSubscription protectedProcedure — re-enables a cancel_at_period_end subscription before it expires
- [x] Backend: DB helper updateSubscriptionStatus to set cancel_at_period_end flag and status
- [x] Frontend: Billing page — "Cancel Subscription" button visible only for active paid plans
- [x] Frontend: Confirmation dialog with plan name, end date, feature loss warning, and "Keep Plan" / "Cancel Subscription" actions
- [x] Frontend: Post-cancel state — shows "Cancels on [date]" badge with Reactivate option
- [x] Frontend: Optimistic UI update so the page reflects cancellation immediately without full reload
- [x] Tests: cancelSubscription calls Stripe and updates DB; reactivateSubscription reverses it; non-subscriber gets FORBIDDEN

## Win-Back Offer & Churn Survey
- [x] DB: add churn_reasons table (id, userId, plan, reason enum, canceledAt)
- [x] Backend: billing.cancelSubscription updated to accept optional reason param and save to churn_reasons
- [x] Backend: admin.getChurnReasons query — returns reason breakdown counts for Admin Dashboard
- [x] Frontend: cancellation dialog rebuilt as 3-step flow: Step 1 reason survey, Step 2 win-back offer with promo code, Step 3 final confirm
- [x] Frontend: win-back step shows "20% off next 3 months" offer with copyable promo code WINBACK20
- [x] Frontend: reason survey — 4 radio options: Too expensive / Not using it / Missing features / Other
- [x] Admin Dashboard Revenue tab: churn reasons donut/bar chart
- [x] Tests: cancellation with reason saves to DB; admin.getChurnReasons returns correct breakdown
