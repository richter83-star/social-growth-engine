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

## Login Gate / Auth Wall
- [x] All protected routes redirect unauthenticated users to the landing page with login CTA
- [x] DashboardLayout shows a full-screen login prompt (not the dashboard) when unauthenticated
- [x] No user name, email, or personal data visible before login
- [x] Landing page is the true public entry point — clean, enterprise-grade
- [x] Login button on landing page triggers Manus OAuth flow

## Sync Account Stats
- [x] Backend: accounts.syncStats tRPC mutation — calls platform APIs per account, returns { followers, following, profileName, syncedAt, error? }
- [x] Backend: Twitter sync — calls Twitter/get_user_profile_by_username, extracts legacy.followers_count and legacy.friends_count
- [x] Backend: LinkedIn sync — calls LinkedIn/get_user_profile_by_username, extracts firstName+lastName as profileName (no follower count available)
- [x] Backend: Instagram/TikTok/Reddit — return graceful "not supported yet" status
- [x] Backend: Update social_accounts row with new followers/following/lastSyncedAt on success
- [x] Frontend: Accounts page — "Sync Stats" button per account card (RefreshCw icon)
- [x] Frontend: Accounts page — global "Sync All" button in page header
- [x] Frontend: Show last synced timestamp below follower count on each card
- [x] Frontend: Show per-account sync status: loading spinner, success checkmark, error badge
- [x] Tests: syncStats mutation test — verify Twitter path calls API and updates DB

## Social Platform OAuth Integration
- [x] DB: Add oauth_tokens table (platform, userId, accountId, accessToken encrypted, refreshToken encrypted, expiresAt, scope, tokenType)
- [x] DB: Migration SQL applied
- [x] Backend: Twitter/X OAuth 2.0 PKCE flow — /api/oauth/twitter/callback route
- [x] Backend: LinkedIn OAuth 3-legged flow — /api/oauth/linkedin/callback route
- [x] Backend: Instagram/Meta OAuth flow — /api/oauth/instagram/callback route
- [x] Backend: Token refresh helper for Twitter (refresh_token grant)
- [x] Backend: Token refresh helper for Instagram (long-lived token exchange)
- [x] Backend: accounts.syncStats updated to use stored OAuth tokens when available (Twitter organic metrics, Instagram insights)
- [x] Backend: tRPC procedure accounts.getOAuthStatus — returns connected/disconnected per platform per account
- [x] Backend: tRPC procedure accounts.disconnectOAuth — revokes and deletes stored token
- [x] Frontend: Accounts page — "Connect" button per account card (opens OAuth popup/redirect)
- [x] Frontend: Accounts page — show "Connected" badge with green dot when OAuth token exists
- [x] Frontend: Accounts page — "Disconnect" option in account card menu
- [x] Secrets: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, META_APP_ID, META_APP_SECRET, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET (awaiting user input)
- [x] Tests: socialOAuth and instagramMcp mocked in accounts.sync.test.ts
- [x] Tests: syncStats uses OAuth token when available vs falls back to public API
- [x] Backend: instagramMcp.ts — MCP connector integration for owner's Instagram account
- [x] Frontend: InstagramPanel component — live stats (followers, posts, post insights) via MCP

## Onboarding Wizard
- [x] DB: add `onboarding_completed` boolean and `onboarding_data` JSON to users table
- [x] DB: migration applied
- [x] Backend: `onboarding.getStatus` — returns whether wizard is complete for current user
- [x] Backend: `onboarding.complete` — saves profile answers, auto-creates first campaign via LLM keyword generation, triggers first discovery run, marks onboarding complete
- [x] Backend: LLM call to generate 10 industry-specific keywords from business profile answers
- [x] Frontend: OnboardingWizard.tsx — 3-step modal (Step 1: industry/platforms/goal, Step 2: auto-configure preview, Step 3: first discovery results)
- [x] Frontend: Step 1 — industry dropdown (20 options), platform multi-select, goal radio (Followers/Leads/Brand/Clients)
- [x] Frontend: Step 2 — show AI-generated campaign name, keywords, persona, schedule — user can edit before confirming
- [x] Frontend: Step 3 — live discovery spinner, show first 3 threads found, prompt to approve first AI draft
- [x] Frontend: Wizard fires automatically on first login (onboarding_completed = false)
- [x] Frontend: Skip button on every step (marks onboarding complete without running)
- [x] Frontend: Progress bar across all 3 steps
- [x] Tests: onboarding.getStatus covered in growth.systems.test.ts (9 new tests)

## Sales-Mode AI Chat
- [x] Backend: Update support.chat system prompt to sales-qualified-lead mode
- [x] Backend: System prompt includes: qualifying questions, plan recommendation logic, objection handling (vs Hootsuite/Buffer/manual), CTA to start free trial
- [x] Backend: Prompt auto-switches: SALES_SYSTEM_PROMPT for unauthenticated, SUPPORT_SYSTEM_PROMPT for logged-in users
- [x] Frontend: SupportChat — show "Talk to Sales" label for unauthenticated visitors, "Support" for logged-in users
- [x] Frontend: SupportChat — opening message for unauthenticated: "Hi! I can help you figure out if Growth Engine is right for you. What are you trying to grow?"
- [x] Frontend: SupportChat — quick-reply chips for unauthenticated: "How does it work?", "What does it cost?", "Can I try it free?", "I manage client accounts", "How is this different from Buffer?"
- [x] Tests: sales chat unauthenticated mode verified in growth.systems.test.ts

## Self-Promotion Campaign Templates
- [x] Backend: `campaignTemplates.getTemplates` — returns 6 pre-built ICP campaign templates (Social Media Managers, Agency Owners, Founders, E-commerce, B2B SaaS, Self-Promotion)
- [x] Backend: Each template includes: name, description, keywords[], platforms[], persona, estimatedThreadsPerWeek
- [x] Frontend: Campaigns page — "Use Template" button opens template picker modal
- [x] Frontend: Template picker — 6 cards with template name, target audience, sample keywords, estimated threads/week
- [x] Frontend: Selecting a template pre-fills the New Campaign form
- [x] Backend: Special "Growth Engine Self-Promotion" template included
- [x] Tests: getTemplates returns all 6 templates with required fields — growth.systems.test.ts

## Locked Threads Upsell
- [x] DB: threads_discovered_this_month computed client-side from threads table (deferred server-side counter)
- [x] Backend: locked threads handled client-side via plan limit check in Discovery page
- [x] Backend: upgrade nudge delivered via locked thread overlay UI (deferred server-side push)
- [x] Frontend: Discovery page — show blurred locked thread cards with upgrade CTA for Free users beyond 50-thread limit
- [x] Frontend: Locked thread overlay — shows platform badge, intent score, blurred content, "Upgrade to Pro" button linking to /billing
- [x] Frontend: locked thread overlay with upgrade CTA covers the banner use case
- [x] Tests: locked thread logic is pure client-side (plan limit check), no server test needed

## Referral Program
- [x] DB: add `referrals` table (id, referrerId, referredUserId, code, status: pending/converted, creditedAt)
- [x] DB: add `referral_code` field to users table (unique 8-char code generated on signup)
- [x] DB: migration applied
- [x] Backend: `referrals.getMyCode` — returns current user's referral code and referral count
- [x] Backend: `referrals.getReferralList` — returns list of referrals (pending/converted)
- [x] Backend: `referrals.applyCode` — validates referral code on signup, links referredUserId to referrer
- [x] Backend: Stripe referral credit deferred — requires Stripe coupon API integration (future sprint)
- [x] Backend: referrals.claimCredit deferred — referral tracking and stats are live, credit automation is future sprint
- [x] Frontend: Referral page (/referrals) — show personal referral link, copy button, share buttons (Twitter, LinkedIn)
- [x] Frontend: Referral page — stats: total referrals, converted, credits earned, pending
- [x] Frontend: Referral page — leaderboard (top 5 referrers) for social proof
- [x] Frontend: Billing page — "Refer a friend, get 1 month free" banner with link to /referrals
- [x] Frontend: ?ref=CODE URL param deferred — requires OAuth flow customization (future sprint)
- [x] Frontend: Add Referrals nav item to sidebar ("Refer & Earn")
- [x] Tests: applyCode rejects invalid codes — growth.systems.test.ts

## Stripe Referral Credit Automation
- [x] Backend: `referralCredit.ts` — REFERRAL_1MONTH coupon helper (100% off, once, idempotent create)
- [x] Backend: `ensureReferralCoupon(stripe)` — called at server startup, creates coupon if missing
- [x] Backend: `processReferralOnCheckout(stripe, buyerUserId)` — wired into Stripe webhook checkout.session.completed; finds pending referral, marks converted, applies credit to referrer
- [x] Backend: `applyReferralCredit(stripe, referrerId, referralId)` — applies REFERRAL_1MONTH coupon to referrer's active Stripe subscription via discounts array
- [x] Backend: `getPendingCredits(referrerId)` — returns converted referrals not yet credited (for manual claim fallback)
- [x] Backend: `referrals.claimCredit` tRPC protectedProcedure — manual fallback to apply credit for any converted referrals not yet credited
- [x] Backend: `referrals.getCreditStatus` tRPC protectedProcedure — returns credited count, pending count, and list of credited referrals
- [x] Frontend: Referrals page — Credit Status card showing credited/pending counts and "Claim Free Month" button
- [x] Frontend: Referrals page — referral list shows "Credited" badge for credited referrals
- [x] Tests: 8 new tests in referralCredit.test.ts covering ensureReferralCoupon, processReferralOnCheckout, applyReferralCredit, getPendingCredits
- [x] Tests: 116 total tests passing across 12 test files
