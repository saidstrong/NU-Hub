# NU Atrium — полный blueprint сайта

## 1. Что это за продукт
NU Atrium — это campus utility platform для студентов. Продукт объединяет:
- marketplace для объявлений,
- events для кампусных событий,
- connect для людей, друзей, сообществ и сообщений,
- profile как campus identity,
- campus information module,
- moderation,
- notifications,
- operational metrics и maintenance.

Цель продукта: дать студенту одно место для повседневной campus-жизни — найти людей, события, вещи, сообщества и полезную информацию.

---

## 2. Product scope

### 2.1 Основные домены
1. Auth / onboarding
2. Profiles
3. Friends
4. Friend messaging
5. Marketplace
6. Marketplace messaging
7. Events + RSVP
8. Communities + community posts
9. Notifications
10. Moderation-lite
11. Campus information
12. Admin/internal pages
13. Operational metrics
14. Maintenance / cleanup
15. Rate limit analytics

### 2.2 Что НЕ входит в текущий scope
- realtime sockets
- read receipts
- typing indicators
- native mobile app
- Lost & Found (отдельный будущий домен)
- recommendation engine
- advanced analytics dashboard
- large CMS/admin editing system

---

## 3. Tech stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- dark premium design system

### Backend
- Next.js Server Actions
- Route Handlers (`/api/...`)

### Database / Auth / Storage
- Supabase Postgres
- Supabase Auth
- Supabase Storage

### Infra
- Vercel
- Upstash Redis

### Observability
- structured logger
- Sentry
- health endpoint

---

## 4. Folder structure (high-level)

```text
app/
  (auth)/
    welcome/
    login/
    signup/
  (app)/
    home/
    market/
      item/[id]/
      messages/
      messages/[conversationId]/
      post/
    events/
      [id]/
      create/
      my-events/
    connect/
      people/
      people/[id]/
      friends/
      communities/
      communities/[id]/
      messages/
      messages/[conversationId]/
    profile/
      edit/
      settings/
      notifications/
      moderation/
      metrics/
    campus/
      services/[slug]/
  api/
    health/
    maintenance/
      cleanup/
      metrics/

components/
  shell/
  ui/

lib/
  auth/
  campus/
  config/
  connect/
  events/
  maintenance/
  market/
  metrics/
  moderation/
  notifications/
  observability/
  profile/
  search/
  security/
  supabase/
  validation/

types/
  database.ts

supabase/
  migrations/

public/
  campus/
```

---

## 5. Navigation / information architecture

### Public/auth area
- `/welcome`
- `/login`
- `/signup`

### Main authenticated navigation
Bottom nav:
- Home
- Market
- Events
- Connect
- Profile

### Home as dashboard
Home содержит:
- global search
- quick access
- featured listings
- upcoming events
- suggested people / communities

---

## 6. Layout system

### 6.1 Root layout
Назначение:
- global HTML/body
- font setup
- global background
- max-width discipline
- desktop/mobile shell compatibility

### 6.2 Auth layout
Назначение:
- centered auth container
- premium minimal auth structure
- stable vertical rhythm

### 6.3 App layout
Назначение:
- authenticated shell
- shared spacing/padding
- bottom nav placement
- desktop max-width (`max-w-6xl` style discipline)

### 6.4 Visual layout principles
- one hero container at top of page
- search often lives inside same top container
- page sections are `SectionCard`-style blocks
- one primary action per page
- calmer metadata blocks
- compact empty states

---

## 7. Design system

### 7.1 Design direction
Quiet Premium Dark SaaS.

### 7.2 Color tokens
- app background: near-black navy
- section surface: dark surface
- elevated surface: slightly lighter dark
- primary text: near white
- secondary text: muted gray
- primary accent: blue
- semantic colors: success / warning / error

### 7.3 Component primitives
- `SectionHeader`
- `SectionCard`
- `FormSection`
- `ShellButton`
- `SubmitButton`
- `SearchBar`
- `WireField`
- `TagChip`
- `FilterRow`
- `EmptyState`
- `FeedbackBanner`
- `BottomNav`

### 7.4 Interaction rules
- primary button is visually dominant
- chips are quieter than content
- search is embedded, not floating randomly
- messaging uses chat-style bubbles
- listing images should be visually strong and scrollable when multiple

---

## 8. Auth & onboarding domain

### 8.1 Main behavior
- user can sign up
- user can log in
- after auth, app route access opens

### 8.2 Security
- auth actions protected by rate limiting
- currently auth brute-force protection should be treated as a special operational area to harden further if needed

### 8.3 Welcome page UX
- title
- one short line
- primary CTA: create account
- secondary CTA: log in
- no extra dead buttons

---

## 9. Profiles domain

### 9.1 Purpose
Campus identity page for each student.

### 9.2 Core profile data
Stored in `profiles` table.

Key fields include:
- `user_id`
- `full_name`
- `avatar_path`
- `school`
- `major`
- `year_label`
- `bio` / about
- interests / goals / collaboration context
- onboarding flags
- optional links JSON

### 9.3 Optional social/personal fields
For launch, stored inside `profiles.links` JSON:
- `telegram`
- `instagram`
- `relationship_status`

### 9.4 Profile pages
- `/profile` — own profile
- `/profile/edit` — edit form
- `/connect/people/[id]` — public person profile

### 9.5 Profile UI structure
- hero
- identity summary block
- about
- academic context
- interests / goals
- social & personal (only if values exist)
- quick actions

---

## 10. Friends domain

### 10.1 Purpose
Students can send friend requests and accept/reject them.

### 10.2 Table
`friendships`

### 10.3 Statuses
- `pending`
- `accepted`
- `rejected`

### 10.4 Rules
- one deterministic friendship pair
- requester cannot be same as addressee
- RLS participant-scoped

### 10.5 UI
- `/connect/friends`
- incoming friend requests
- accepted friends list
- add / cancel / accept / reject actions on person detail page

---

## 11. Friend messaging domain

### 11.1 Separate messaging system
Friend messaging intentionally separated from marketplace messaging.

### 11.2 Tables
- `friend_conversations`
- `friend_messages`

### 11.3 Logic
- only accepted friends can start a conversation
- deterministic user pair uniqueness
- participant-only RLS
- text-only messages

### 11.4 Pages
- `/connect/messages`
- `/connect/messages/[conversationId]`

### 11.5 UX
- inbox page
- chat-style thread page
- send composer
- no realtime/read receipts yet

---

## 12. Marketplace domain

### 12.1 Purpose
Student marketplace for campus essentials.

### 12.2 Main tables
- `listings`
- `listing_images`

### 12.3 Listing core fields
Typical data:
- title
- description
- category
- price
- condition
- pickup/location
- status
- created_by
- timestamps
- hidden/moderation flags if applicable

### 12.4 Storage
Bucket for listing images.
Client-direct upload to storage is used to avoid Vercel payload limits.

### 12.5 Pages
- `/market`
- `/market/post`
- `/market/item/[id]`
- `/market/messages`
- `/market/messages/[conversationId]`

### 12.6 UX behavior
- horizontally scrollable categories on mobile
- primary action: Post listing
- search
- recent listings
- listing detail with strong image treatment
- listing detail gallery with horizontal thumbnail scroll on mobile

---

## 13. Marketplace messaging domain

### 13.1 Separate messaging tables
- `conversations`
- `messages`

These are listing-scoped, not general-purpose.

### 13.2 Logic
- buyer-seller conversation tied to listing
- unique conversation per `(listing_id, buyer_id)`
- participant-only access
- text-only MVP

### 13.3 Pages
- `/market/messages`
- `/market/messages/[conversationId]`

### 13.4 UX
- inbox list with counterpart + listing context
- thread page in chat-style layout

---

## 14. Events domain

### 14.1 Purpose
Campus events discovery and creation.

### 14.2 Main tables
- `events`
- `event_participants`

### 14.3 Event fields
Typical data:
- title
- description
- category
- date/time
- location
- created_by
- is_published
- is_hidden
- cover_path

### 14.4 RSVP system
Statuses:
- `going`
- `interested`

### 14.5 Pages
- `/events`
- `/events/create`
- `/events/[id]`
- `/events/my-events`

### 14.6 Important privacy rule
RSVP rows must only be visible if parent event is visible:
- published and not hidden
- or owner
- or admin

### 14.7 UX
- search
- create event primary CTA
- featured/upcoming list
- event detail with RSVP controls
- unfinished calendar entry removed from visible UI if not ready

---

## 15. Communities domain

### 15.1 Purpose
Student communities/circles.

### 15.2 Main tables
- `communities`
- `community_members`
- `community_posts`

### 15.3 Community data
- name
- description
- avatar_path
- created_by
- is_hidden

### 15.4 Membership
- joined memberships
- owner moderation
- privacy-sensitive RLS

### 15.5 Community posts
Minimal text-only MVP inside community detail.

### 15.6 Pages
- `/connect/communities`
- `/connect/communities/create`
- `/connect/communities/[id]`

### 15.7 Privacy rule
Joined membership rows must not leak for hidden communities except to owner/admin/appropriate self access.

---

## 16. Search domain

### 16.1 Purpose
Cross-surface discovery.

### 16.2 Targets
- market listings
- events
- people
- communities

### 16.3 Home/global search
Search bar appears in top panel and points to search flow.

### 16.4 Principle
Visible controls should be functional or removed.
Fake filters were removed before launch.

---

## 17. Notifications domain

### 17.1 Purpose
Surface relevant activity to users.

### 17.2 Table
`notifications`

### 17.3 Sources
- community post creation for owner
- event RSVP creation for owner
- potentially other lightweight product notifications

### 17.4 Page
`/profile/notifications`

### 17.5 Features
- unread summary
- mark one as read
- mark all as read

---

## 18. Moderation domain

### 18.1 Purpose
Minimal moderation-lite system.

### 18.2 Table
`content_reports`

### 18.3 Target types
- listing
- event
- community
- community_post

### 18.4 Moderation model
- report content
- hidden flags on core content tables
- admin moderation page

### 18.5 Page
`/profile/moderation`

### 18.6 Access
Admin-only.

---

## 19. Campus Information domain

### 19.1 Purpose
Static campus information module.

### 19.2 Main overview page
`/campus`

Sections:
- Code of Conduct
- Campus Map
- Services & Prices
- Important Contacts

### 19.3 Assets
Stored in `public/campus/`.
Examples:
- `code-of-conduct.pdf`
- `campus-map.pdf` or image
- pricing assets under `public/campus/services/`

### 19.4 Service detail pages
`/campus/services/[slug]`

### 19.5 Data source
Static typed data in `lib/campus/data.ts`.

### 19.6 Campus service shape
Each service may contain:
- slug
- name
- description
- location
- contact
- hours
- price asset URL

---

## 20. Settings domain

### 20.1 Page
`/profile/settings`

### 20.2 Principle
No dead buttons at launch.
If Help / Privacy not functional, remove/hide them.

---

## 21. Operational / internal pages

### 21.1 Moderation
`/profile/moderation`

### 21.2 Metrics
`/profile/metrics`

### 21.3 Notifications
`/profile/notifications`

Admin pages must be protected both app-side and DB-side.

---

## 22. Database overview

## 22.1 Core table groups

### Identity / social
- `profiles`
- `friendships`
- `friend_conversations`
- `friend_messages`

### Marketplace
- `listings`
- `listing_images`
- `conversations`
- `messages`

### Events
- `events`
- `event_participants`

### Communities
- `communities`
- `community_members`
- `community_posts`

### Notifications / moderation
- `notifications`
- `content_reports`

### Ops / analytics
- `daily_metrics`
- `rate_limit_events`

---

## 22.2 Important database principles
- UUID primary keys where appropriate
- RLS on sensitive tables
- owner/admin/participant scoping
- timestamps on key tables
- `updated_at` trigger pattern where needed
- deterministic uniqueness for friendship / conversation pairs

---

## 23. RLS philosophy

NU Atrium uses defense-in-depth:
1. application validation
2. database enforcement (RLS)
3. operational controls

### 23.1 Typical access models
- participant-only messaging
- owner-only content edits
- admin-only moderation and metrics
- hidden content not exposed to unrelated users

### 23.2 Must-preserve privacy rules
- hidden community membership should not leak
- hidden/draft event RSVP should not leak
- admin pages should remain inaccessible to non-admins

---

## 24. Validation layer

Validation lives in `lib/validation/*`.

Examples:
- `profile.ts`
- `connect.ts`
- `events.ts`
- `market.ts`
- `moderation.ts`
- `media.ts`

Purpose:
- strong input validation
- product-safe errors
- predictable server actions

---

## 25. Security layer

### 25.1 Rate limiting
Distributed rate limiting via Upstash Redis.

Protected actions include:
- friend messages
- marketplace messages
- community posts
- event RSVP actions
- conversation creation

### 25.2 Rate limit persistence
Blocked attempts are recorded in:
- `rate_limit_events`

This feeds metrics later.

### 25.3 Upload safety
Media validation includes:
- MIME checks
- size checks
- signature checks
- filename safety checks
- path safety

### 25.4 Fail-open / fail-safe examples
- Redis failure: limiter can fail open, with logging
- metrics route without service role: fail with logged error
- cron route requires secret auth

---

## 26. Observability

### 26.1 Structured logger
Used across actions/loaders/routes.

Standard context often includes:
- action
- route
- userId
- requestId
- durationMs
- outcome

### 26.2 Sentry
Minimal Sentry integration for error aggregation.
No replay/profiling/tracing in current launch scope.

### 26.3 Health endpoint
`/api/health`
Returns:
- status
- timestamp

---

## 27. Maintenance / cron system

### 27.1 Cleanup route
`/api/maintenance/cleanup`

Protected by:
- `Authorization: Bearer <CRON_SECRET>`

Uses service-role client.

### 27.2 Cleanup tasks
- stale read notifications cleanup
- stale drafts cleanup
- stale empty conversations cleanup
- upload reconciliation report

### 27.3 Modes
- default destructive cron mode
- `dryRun=true`
- explicit manual destructive mode with query params

### 27.4 Metrics route
`/api/maintenance/metrics`

Aggregates daily metrics and upserts `daily_metrics`.

### 27.5 Cron schedule
Vercel cron:
- `0 2 * * *` → metrics
- `0 3 * * *` → cleanup

---

## 28. Metrics system

### 28.1 Table
`daily_metrics`

### 28.2 Fields
Typical aggregates:
- day
- active_users
- new_users
- friend_messages
- marketplace_messages
- listings_created
- community_posts
- event_rsvps
- notifications_created
- moderation_reports
- rate_limit_hits

### 28.3 Active users definition
Approximation based on distinct actors in interaction tables for a given UTC day.

### 28.4 Admin page
`/profile/metrics`

---

## 29. Env variables

### Required for production
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Strongly recommended
- `SENTRY_DSN`

### Optional later
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

---

## 30. UI rules to preserve if rebuilding from scratch

### 30.1 General page pattern
1. unified top panel (title + right-side action + search if relevant)
2. compact action row
3. content sections with `SectionCard`
4. bottom nav for authenticated area

### 30.2 Content rule
Do not overload pages with explanatory filler text.
If the title already explains the section, remove extra description.

### 30.3 Messaging rule
Threads should feel like chat, not stacked admin cards.

### 30.4 Listings media rule
- cards: clearer larger preview
- detail page: large hero image + horizontal thumbnail scroll on mobile

### 30.5 Filter rule
Every visible filter-like control must work or be removed.

---

## 31. Rebuild order if creating from scratch

### Phase 1 — foundation
- Next.js app shell
- auth
- Supabase integration
- design system
- bottom nav
- layouts

### Phase 2 — core domains
- profiles
- marketplace + listing images
- events + RSVP
- connect people / communities

### Phase 3 — messaging
- marketplace messaging
- friend messaging
- friendships

### Phase 4 — trust + safety
- moderation-lite
- notifications
- upload hardening
- rate limiting

### Phase 5 — operations
- health endpoint
- cleanup route
- metrics route
- daily metrics
- Sentry
- structured logging

### Phase 6 — campus module
- static campus overview
- service detail pages

---

## 32. What to build first if speed matters
If rebuilding quickly, minimum order:
1. auth
2. profiles
3. market
4. events
5. connect
6. bottom nav + dashboard
7. marketplace messaging
8. friendships + friend messaging
9. moderation + notifications
10. campus
11. ops/metrics/cron

---

## 33. Launch-critical rules
- no dead buttons
- no fake filters
- no unfinished visible features
- hidden content must stay private
- cron routes must be authenticated
- service-role required for maintenance/metrics writes
- app must work on mobile and desktop

---

## 34. Summary
NU Atrium is a modular campus platform with:
- strong frontend information architecture,
- separated product domains,
- Supabase-based secure backend,
- Redis-based rate limiting,
- moderation and privacy controls,
- static campus information,
- operational cron + metrics infrastructure.

If rebuilding from scratch, preserve:
- domain separation,
- RLS-first security,
- separate messaging systems by context,
- quiet premium design system,
- static campus content model,
- operational layer (health, logs, cron, metrics, rate-limit analytics).

