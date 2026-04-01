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
- [ ] DB: add `instagram` and `tiktok` to the `platform` enum in `socialAccounts` table
- [ ] DB: add `instagram` and `tiktok` to the `platforms` JSON array validation in `campaigns` table
- [ ] Backend: update Zod platform enum in accounts.create and campaigns.create procedures
- [ ] Frontend: Accounts page — add Instagram and TikTok to platform dropdown with icons
- [ ] Frontend: Campaigns page — add Instagram and TikTok to platform multi-select
- [ ] Frontend: Discovery page — show Instagram/TikTok platform badges
- [ ] Frontend: Accounts page — show correct platform color/icon for Instagram and TikTok cards
- [ ] Tests: update platform validation tests to include instagram and tiktok
