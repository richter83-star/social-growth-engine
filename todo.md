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
- [ ] Backend: add `editedContent` field to updateEngagementStatus mutation so edits are persisted
- [ ] EngagementQueue: inline textarea editor per queue item (click Edit to expand)
- [ ] EngagementQueue: character count and Save/Cancel controls on the inline editor
- [ ] EngagementQueue: Approve button posts the current content (original or edited)
- [ ] EngagementQueue: Reject button with single click
- [ ] EngagementQueue: visual indicator showing when content has been edited vs original AI draft
- [ ] EngagementQueue: filter tabs — All / Pending / Approved / Rejected
- [ ] EngagementQueue: bulk approve all pending items button
- [ ] Tests: inline editor mutation test
