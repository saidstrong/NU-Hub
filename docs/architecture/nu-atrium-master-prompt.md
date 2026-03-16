You are working on **NU Atrium / NU-Hub**, a campus utility platform for students.

This prompt is the full master context for the project.
Treat it as the primary source of truth when helping with planning, implementation, bug fixing, UI polish, and launch tasks.

==================================================
1. PRODUCT OVERVIEW
==================================================

NU Atrium is a campus platform that combines:
- marketplace
- events
- people discovery
- friends
- friend messaging
- marketplace messaging
- communities
- community posts
- notifications
- moderation-lite
- campus information
- admin/internal metrics
- operational maintenance

The product goal is:
Give students one structured place to handle everyday campus life:
- find people
- join communities
- discover events
- buy/sell things
- message others
- view useful campus information

The product should feel:
- premium
- calm
- structured
- trustworthy
- modern
- like serious software for ambitious students

==================================================
2. TECH STACK
==================================================

Frontend:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS

Backend:
- Next.js Server Actions
- Route Handlers

Database/Auth/Storage:
- Supabase Postgres
- Supabase Auth
- Supabase Storage

Infra:
- Vercel
- Upstash Redis

Observability:
- structured logs
- Sentry
- /api/health
- cron maintenance
- metrics aggregation

==================================================
3. CORE PRODUCT DOMAINS
==================================================

Implemented / expected domains:
1. Auth / onboarding
2. Profiles
3. Friends
4. Friend messaging
5. Marketplace
6. Marketplace messaging
7. Events + RSVP
8. Communities
9. Community posts
10. Notifications
11. Moderation-lite
12. Campus information
13. Admin/internal metrics
14. Maintenance / cleanup
15. Distributed rate limiting
16. Rate-limit analytics

Not currently in scope:
- Lost & Found
- native mobile app
- realtime sockets
- read receipts
- typing indicators
- recommendation engine
- advanced analytics dashboard
- large CMS/admin editing system

==================================================
4. ROUTE MAP
==================================================

Auth/public:
- /welcome
- /login
- /signup

Authenticated main:
- /home
- /market
- /market/post
- /market/item/[id]
- /market/messages
- /market/messages/[conversationId]
- /events
- /events/create
- /events/[id]
- /events/my-events
- /connect
- /connect/friends
- /connect/people
- /connect/people/[id]
- /connect/communities
- /connect/communities/[id]
- /connect/messages
- /connect/messages/[conversationId]
- /profile
- /profile/edit
- /profile/settings
- /profile/notifications
- /profile/moderation
- /profile/metrics
- /campus
- /campus/services/[slug]

API / ops:
- /api/health
- /api/maintenance/cleanup
- /api/maintenance/metrics

==================================================
5. DATABASE DOMAIN MODEL
==================================================

Core tables:
- profiles
- friendships
- friend_conversations
- friend_messages
- listings
- listing_images
- conversations
- messages
- events
- event_participants
- communities
- community_members
- community_posts
- notifications
- content_reports
- daily_metrics
- rate_limit_events

Important architectural rule:
Friend messaging and marketplace messaging are intentionally separate systems.

==================================================
6. SECURITY MODEL
==================================================

The project uses a defense-in-depth approach:
1. application-level checks
2. database-level RLS
3. operational abuse protection

Key principles:
- owner-only writes where appropriate
- participant-only messaging
- hidden content should not leak
- admin-only internal visibility where appropriate
- no fake filters
- no dead buttons
- no unfinished visible features at launch

Critical privacy rules:
- hidden community membership must not leak
- hidden/draft event RSVP rows must not leak

Admin model:
- admin is based on app_metadata.role = "admin"
- DB uses public.is_admin()
- admin pages:
  - /profile/moderation
  - /profile/metrics

==================================================
7. ENVIRONMENT VARIABLES
==================================================

Required in production:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Strongly recommended:
- SENTRY_DSN

Optional later:
- SENTRY_ORG
- SENTRY_PROJECT
- SENTRY_AUTH_TOKEN

==================================================
8. RATE LIMITING / ABUSE PROTECTION
==================================================

The app uses distributed Redis-backed rate limiting via Upstash.

Important behavior:
- limiter should be distributed
- fail-open if Redis unavailable
- block events should be logged
- blocked events should be persisted in rate_limit_events
- rate_limit_events feeds daily_metrics.rate_limit_hits

Do not remove this architecture unless explicitly requested.

==================================================
9. OPERATIONS / CRON
==================================================

Health:
- /api/health returns status + timestamp

Maintenance cleanup:
- /api/maintenance/cleanup
- requires Authorization: Bearer <CRON_SECRET>
- uses service-role client
- supports dryRun mode
- supports cleanup tasks:
  - stale read notifications
  - stale drafts
  - stale empty conversations
  - upload reconciliation report

Metrics:
- /api/maintenance/metrics
- requires Authorization: Bearer <CRON_SECRET>
- uses service-role client
- aggregates daily_metrics

Cron schedule:
- 0 2 * * * => metrics
- 0 3 * * * => cleanup

==================================================
10. OBSERVABILITY
==================================================

The project already uses:
- structured logger
- action/loader timing
- slow-path warnings
- Sentry
- health endpoint

Use structured logs where useful.
Do not replace the logger.
Sentry is additive, not a replacement.

==================================================
11. CAMPUS INFORMATION MODULE
==================================================

Campus module is static/content-driven.

Overview page:
- /campus

Service detail pages:
- /campus/services/[slug]

Campus content is based on:
- static typed data in lib/campus/data.ts
- public assets in public/campus/

Campus sections:
- Code of Conduct
- Campus Map
- Services & Prices
- Important Contacts

Service detail pages may include:
- description
- location
- contact
- hours
- pricing asset

Do not turn this into a CMS unless explicitly requested.

==================================================
12. UI / UX DESIGN DIRECTION
==================================================

Design direction:
- Quiet Premium Dark SaaS

Product personality:
- intelligent
- calm
- premium
- structured
- trustable
- ambitious

UI rules:
- one primary action per page
- fewer surfaces, stronger hierarchy
- minimal filler copy
- if a title already explains the section, remove extra explanation
- no fake filters
- no dead buttons
- no unfinished visible features

Visual rules:
- strong typography
- dark premium surfaces
- restrained accent usage
- compact action rows
- consistent section rhythm
- chat-style messaging
- listing media should feel strong and usable
- mobile + desktop should both work well

==================================================
13. LAYOUT / DESIGN SYSTEM RULES
==================================================

Page structure:
- unified top panel (title + actions + search if relevant)
- compact action row
- SectionCard-driven content blocks
- bottom nav in app shell

Shared primitives expected:
- ShellButton
- SubmitButton
- SectionCard
- SectionHeader
- WireField
- SearchBar
- TagChip
- EmptyState
- FeedbackBanner
- BottomNav

Important UI trust decisions already made:
- unnecessary explanatory text was heavily reduced
- fake filters were removed
- event calendar entry was removed from visible UI if unfinished
- dead settings buttons (Help/Privacy) were removed if non-functional
- messaging threads were made more chat-like
- listing categories are horizontally scrollable on mobile
- desktop layout was polished
- listing photos and gallery were improved

==================================================
14. PROFILE RULES
==================================================

Profile is identity-first.

Optional launch-safe profile fields are stored in profiles.links JSON:
- telegram
- instagram
- relationship_status

These are optional and shown only if present.

Do not overcomplicate them unless explicitly asked.

==================================================
15. KNOWN ARCHITECTURAL DECISIONS TO PRESERVE
==================================================

Preserve these unless explicitly told otherwise:
- separate marketplace messaging and friend messaging
- RLS-first security
- static campus content model
- service-role usage for maintenance/metrics
- Redis-based distributed rate limiting
- rate_limit_events persistence
- daily_metrics aggregation
- admin pages at /profile/moderation and /profile/metrics
- quiet premium dark design system

==================================================
16. HOW TO WORK ON THIS PROJECT
==================================================

Default working rules:
- prefer targeted patches/diffs over broad rewrites
- avoid changing backend/schema/RLS unless truly needed
- preserve routes and core behavior
- keep improvements narrow and practical
- launch-focused work should prioritize QA, bug fixes, and small safe improvements
- do not restart architecture discussions from zero
- do not do speculative rewrites
- do not invent new product domains casually

When asked to build something:
1. first produce a plan
2. then list exact files
3. then describe risks / scope-control notes
4. only after approval, generate targeted patches

==================================================
17. REBUILD ORDER IF STARTING FROM ZERO
==================================================

Correct rebuild order:
1. Foundation
2. Auth
3. Profiles
4. Marketplace
5. Events
6. Connect discovery
7. Community posts
8. Friendships
9. Friend messaging
10. Marketplace messaging
11. Notifications
12. Moderation
13. Campus module
14. Security / rate limiting
15. Observability / operations
16. Final UI polish

Do not build everything at once.

==================================================
18. CURRENT STATE
==================================================

Assume the project is near-launch / launch-ready.

Already completed in prior work:
- core product domains
- admin internal pages
- moderation-lite
- metrics
- cleanup cron
- Redis rate limiting
- persistent rate-limit hit tracking
- Sentry
- campus info module
- major UI redesign
- trust cleanup
- desktop polish

So if I ask for help in this chat, assume:
- the architecture already exists
- the product is not a fresh MVP
- I want targeted continuation, not a total restart

==================================================
19. WHAT TO DO IF ASKED FOR HELP NEXT
==================================================

If I ask for:
- bug fixing → focus on minimal safe fixes
- launch prep → focus on QA/checklists/production safety
- new feature → keep it narrow and preserve architecture
- rebuild from scratch → use the rebuild order above
- UI work → keep it consistent with quiet premium dark SaaS

Always ask yourself:
- Does this preserve the architecture?
- Is this launch-safe?
- Is this a targeted improvement rather than a broad rewrite?

End of master prompt.