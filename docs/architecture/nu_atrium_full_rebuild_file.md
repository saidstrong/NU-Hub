# NU Atrium — Full Rebuild File

## 1. Purpose
Этот документ — практический full rebuild file для NU Atrium. Его цель: позволить пересобрать проект с нуля, сохранив архитектуру, продуктовые решения, безопасность, операционный слой и UI/UX систему.

Используй его как:
- source of truth для rebuild,
- handoff-документ для нового чата / Codex,
- execution-план для поэтапной сборки.

---

## 2. Product definition

### Что такое NU Atrium
NU Atrium — campus utility platform для студентов. Это не один модуль, а объединённая система для:
- marketplace,
- events,
- people discovery,
- friendships,
- friend messaging,
- marketplace messaging,
- communities,
- community posts,
- notifications,
- moderation-lite,
- campus information,
- internal admin metrics,
- maintenance / cleanup,
- abuse protection.

### Product goal
Дать студенту одно место для повседневной campus-жизни:
- найти людей,
- найти сообщества,
- найти события,
- продавать/покупать вещи,
- переписываться,
- смотреть campus information.

### Product feeling
Продукт должен ощущаться как:
- clean,
- modern,
- trustworthy,
- structured,
- premium,
- serious software for ambitious students.

---

## 3. Tech stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js Server Actions
- Route Handlers (`/api/...`)

### Database / Auth / Storage
- Supabase Postgres
- Supabase Auth
- Supabase Storage

### Infrastructure
- Vercel
- Upstash Redis

### Observability
- structured logs
- Sentry
- `/api/health`
- maintenance cron
- metrics cron

---

## 4. High-level architecture

```text
Client (Next.js UI)
    -> Server Actions / Route Handlers
    -> Domain services
    -> Supabase Postgres/Auth/Storage
    -> Redis (rate limiting)
    -> Observability (logs, Sentry, health, metrics)
```

### Architectural principles to preserve
1. RLS-first security
2. Separate messaging systems by domain
3. Static campus content model
4. Service-role only for privileged ops routes
5. Distributed Redis rate limiting
6. Persistent abuse analytics (`rate_limit_events`)
7. Quiet premium dark design system

---

## 5. Route map

### Public/auth routes
- `/welcome`
- `/login`
- `/signup`

### Main authenticated routes
- `/home`
- `/market`
- `/market/post`
- `/market/item/[id]`
- `/market/messages`
- `/market/messages/[conversationId]`
- `/events`
- `/events/create`
- `/events/[id]`
- `/events/my-events`
- `/connect`
- `/connect/friends`
- `/connect/people`
- `/connect/people/[id]`
- `/connect/communities`
- `/connect/communities/[id]`
- `/connect/messages`
- `/connect/messages/[conversationId]`
- `/profile`
- `/profile/edit`
- `/profile/settings`
- `/profile/notifications`
- `/profile/moderation`
- `/profile/metrics`
- `/campus`
- `/campus/services/[slug]`

### API / ops routes
- `/api/health`
- `/api/maintenance/cleanup`
- `/api/maintenance/metrics`

---

## 6. Folder structure

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
      friends/
      people/
      people/[id]/
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

docs/
  architecture/
  design/
```

---

## 7. Layout system

### Root layout
Назначение:
- global HTML/body
- font
- metadata
- background
- max-width discipline

### Auth layout
Назначение:
- centered auth shell
- premium minimal auth structure

### App layout
Назначение:
- authenticated shell
- responsive content width
- bottom nav
- desktop-friendly width discipline

### Layout rule
Page structure should generally be:
1. unified top panel (title + right-side action + search if relevant)
2. compact action row
3. content sections via cards/sections
4. bottom nav in authenticated shell

---

## 8. Design system

### Design direction
Quiet Premium Dark SaaS.

### Product personality
- intelligent
- calm
- modern
- structured
- trustworthy
- premium

### UI rules
- one primary action per page
- fewer surfaces
- stronger hierarchy
- compact action rows
- little or no filler copy
- no fake filters
- no dead buttons
- no unfinished visible features

### Shared primitives to rebuild
- `ShellButton`
- `SubmitButton`
- `SectionCard`
- `SectionHeader`
- `FormSection`
- `WireField`
- `SearchBar`
- `TagChip`
- `FilterRow`
- `EmptyState`
- `FeedbackBanner`
- `BottomNav`

### Color/token direction
- dark background
- elevated dark surfaces
- bright but restrained primary accent
- strong text contrast
- muted secondary text

### UX decisions already proven valuable
- chat-style messaging bubbles
- horizontal category scroll on mobile
- horizontal image gallery thumbnails on mobile
- less explanatory filler text
- compact actions instead of heavy action boxes

---

## 9. Environment variables

### Required in production
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

## 10. Database tables

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

### Internal/support
- `notifications`
- `content_reports`
- `daily_metrics`
- `rate_limit_events`

---

## 11. Table-by-table rebuild outline

### profiles
Purpose: identity layer for almost all domains.

Recommended fields:
- `user_id uuid primary key`
- `full_name text`
- `avatar_path text`
- `school text`
- `major text`
- `year_label text`
- `bio text`
- `links jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Optional launch-safe data inside `links`:
- `telegram`
- `instagram`
- `relationship_status`

### friendships
Fields:
- `id uuid`
- `requester_id uuid`
- `addressee_id uuid`
- `status text`
- `created_at`
- `updated_at`

Statuses:
- pending
- accepted
- rejected

### friend_conversations
Fields:
- `id uuid`
- `user_a_id uuid`
- `user_b_id uuid`
- `created_at`
- `updated_at`

### friend_messages
Fields:
- `id uuid`
- `conversation_id uuid`
- `sender_id uuid`
- `content text`
- `created_at`

### listings
Fields:
- `id uuid`
- `created_by uuid`
- `title text`
- `description text`
- `category text`
- `price numeric/text depending design`
- `condition text`
- `location text`
- `status text`
- `is_hidden boolean`
- `created_at`
- `updated_at`

### listing_images
Fields:
- `id uuid`
- `listing_id uuid`
- `path text`
- `sort_order integer`
- `created_at`

### conversations (marketplace)
Fields:
- `id uuid`
- `listing_id uuid`
- `buyer_id uuid`
- `seller_id uuid`
- `created_at`
- `updated_at`

### messages (marketplace)
Fields:
- `id uuid`
- `conversation_id uuid`
- `sender_id uuid`
- `content text`
- `created_at`

### events
Fields:
- `id uuid`
- `created_by uuid`
- `title text`
- `description text`
- `category text`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `location text`
- `cover_path text`
- `is_published boolean`
- `is_hidden boolean`
- `created_at`
- `updated_at`

### event_participants
Fields:
- `event_id uuid`
- `user_id uuid`
- `status text`
- `created_at`
- `updated_at`

Statuses:
- going
- interested

### communities
Fields:
- `id uuid`
- `created_by uuid`
- `name text`
- `description text`
- `avatar_path text`
- `is_hidden boolean`
- `created_at`
- `updated_at`

### community_members
Fields:
- `community_id uuid`
- `user_id uuid`
- `status text`
- `created_at`
- `updated_at`

### community_posts
Fields:
- `id uuid`
- `community_id uuid`
- `author_id uuid`
- `content text`
- `created_at`
- `updated_at`
- optional `is_hidden boolean` if needed

### notifications
Fields:
- `id uuid`
- `user_id uuid`
- `type text`
- `payload jsonb`
- `is_read boolean`
- `created_at`

### content_reports
Fields:
- `id uuid`
- `reporter_id uuid`
- `target_type text`
- `target_id uuid/text`
- `reason text`
- `created_at`

### daily_metrics
Fields:
- `day date primary key`
- `active_users integer`
- `new_users integer`
- `friend_messages integer`
- `marketplace_messages integer`
- `listings_created integer`
- `community_posts integer`
- `event_rsvps integer`
- `notifications_created integer`
- `moderation_reports integer`
- `rate_limit_hits integer`
- `created_at`
- `updated_at`

### rate_limit_events
Fields:
- `id uuid`
- `user_id uuid nullable`
- `action text`
- `target_id text nullable`
- `created_at`

---

## 12. RLS model

### Philosophy
Security is enforced both:
1. in server actions
2. in database via RLS

### Rules to preserve
- owner-only writes where appropriate
- participant-only messaging
- admin-only internal data access
- hidden community membership must not leak
- hidden/draft RSVP must not leak
- admin overrides should remain explicit

### Admin model
- user becomes admin via `app_metadata.role = "admin"`
- DB helper `public.is_admin()` is used for policy checks

### Admin-only pages
- `/profile/moderation`
- `/profile/metrics`

---

## 13. Rebuild order

## Phase 1 — Foundation
1. Create Next.js app
2. Add TypeScript + Tailwind
3. Set up folder structure
4. Add root/auth/app layouts
5. Build design system primitives
6. Add bottom nav shell

## Phase 2 — Auth & Profiles
7. Integrate Supabase auth
8. Build `/welcome`, `/login`, `/signup`
9. Create `profiles` table
10. Build `/profile`, `/profile/edit`
11. Add avatar upload

## Phase 3 — Core product domains
12. Build marketplace tables and pages
13. Build events tables and pages
14. Build connect discovery + communities
15. Add community membership flows
16. Add community posts

## Phase 4 — Social layer
17. Build friendships
18. Build friend messaging
19. Build marketplace messaging

## Phase 5 — Trust & support systems
20. Build notifications
21. Build moderation-lite
22. Add hidden content handling

## Phase 6 — Campus module
23. Add static campus overview
24. Add campus service detail pages
25. Add PDF/image assets

## Phase 7 — Security and operations
26. Add Redis rate limiting
27. Add rate_limit_events persistence
28. Add structured logging
29. Add Sentry
30. Add `/api/health`
31. Add maintenance cleanup route
32. Add metrics route
33. Add `daily_metrics`
34. Add cron schedules

## Phase 8 — Final UI / launch cleanup
35. Remove fake filters
36. Remove dead buttons
37. Hide unfinished visible features
38. Polish messaging into chat style
39. Improve listing media
40. Desktop responsiveness pass
41. Final QA

---

## 14. Feature-by-feature dependency map

### Auth depends on
- Supabase clients
- layouts

### Profiles depend on
- auth
- profiles table

### Marketplace depends on
- profiles
- listings
- listing_images
- storage

### Events depend on
- profiles
- events
- event_participants

### Connect depends on
- profiles
- communities
- community_members
- people discovery data

### Friendships depend on
- profiles
- friendships table

### Friend messaging depends on
- accepted friendships
- friend_conversations
- friend_messages

### Marketplace messaging depends on
- listings
- profiles
- conversations
- messages

### Notifications depend on
- core product actions existing

### Moderation depends on
- listings / events / communities / community_posts existing

### Metrics depend on
- activity tables existing
- service-role route access

### Campus depends on
- none of the DB domains strictly; can be static

---

## 15. Exact route build order

### Wave 1
- `/welcome`
- `/login`
- `/signup`
- `/profile`
- `/profile/edit`
- `/home`

### Wave 2
- `/market`
- `/market/post`
- `/market/item/[id]`
- `/events`
- `/events/create`
- `/events/[id]`
- `/events/my-events`

### Wave 3
- `/connect`
- `/connect/people`
- `/connect/people/[id]`
- `/connect/communities`
- `/connect/communities/[id]`
- `/connect/friends`

### Wave 4
- `/market/messages`
- `/market/messages/[conversationId]`
- `/connect/messages`
- `/connect/messages/[conversationId]`

### Wave 5
- `/profile/settings`
- `/profile/notifications`
- `/profile/moderation`
- `/profile/metrics`
- `/campus`
- `/campus/services/[slug]`

### Wave 6
- `/api/health`
- `/api/maintenance/cleanup`
- `/api/maintenance/metrics`

---

## 16. Security / hardening layer

### Redis rate limiting
Protect at least:
- friend messaging send
- marketplace messaging send
- community post create
- RSVP set/clear
- conversation start actions

### Upload validation
For profile/event/community/listing media:
- MIME validation
- size validation
- signature validation
- safe filename/path validation
- owner-prefix storage path discipline

### Persistence of abuse events
- only persist blocked events
- do not persist successful requests

---

## 17. Observability layer

### Structured logger
Use for:
- action logs
- route logs
- slow-path warnings
- metrics / maintenance start/finish/failure

### Sentry
Minimal integration only:
- enabled when DSN exists
- fail-open when DSN missing
- no tracing/replay/profiling required for MVP launch

### Health endpoint
`/api/health` should return:
- status
- timestamp

---

## 18. Maintenance layer

### Cleanup route
`/api/maintenance/cleanup`
Rules:
- `Authorization: Bearer <CRON_SECRET>` required
- use service-role client
- support dry-run
- support explicit delete mode

Cleanup tasks:
- stale read notifications
- stale drafts
- stale empty conversations
- upload reconciliation report

### Metrics route
`/api/maintenance/metrics`
Rules:
- `Authorization: Bearer <CRON_SECRET>` required
- use service-role client
- default target = yesterday UTC
- support optional day param
- upsert one `daily_metrics` row per day

### Cron schedule
- `0 2 * * *` → metrics
- `0 3 * * *` → cleanup

---

## 19. Campus content model

### Assets location
`public/campus/`

Examples:
- `code-of-conduct.pdf`
- `campus-map.pdf` or image
- `services/*.pdf|jpg|png`

### Data file
`lib/campus/data.ts`

### Recommended service model
```ts
 type CampusService = {
   slug: string;
   name: string;
   description: string;
   location?: string;
   contactName?: string;
   contactEmail?: string;
   contactPhone?: string;
   hours?: string;
   priceAssetUrl?: string;
 };
```

---

## 20. UI rebuild rules

### Rules to preserve
- unified hero/header + search top container where relevant
- one clear primary CTA
- compact action rows
- no over-explaining text
- horizontally scrollable categories where useful on mobile
- listing photos should be clear and strong
- conversation pages should feel like real chat
- desktop should not be trapped in mobile-width shell

### Things to avoid
- fake filter controls
- dead buttons
- huge explanatory subtitles everywhere
- unfinished visible features
- overly nested cards inside cards

---

## 21. Build prompts strategy

If using Codex to rebuild:
1. give one domain prompt at a time
2. require implementation plan first
3. approve plan
4. only then allow patches

Do not ask Codex to rebuild the entire platform in one shot.

---

## 22. Production checklist after rebuild

### Git/deploy
- clean working tree
- latest commit pushed
- latest deploy live

### Env
- all required env vars configured

### Supabase
- all migrations applied
- storage policies verified
- admin role works

### Redis
- limiter verified

### Metrics
- route works
- rows appear in `daily_metrics`
- `rate_limit_hits` updates after blocks

### Cleanup
- dry-run works
- auth works

### UI trust checks
- no dead buttons
- no fake filters
- no unfinished visible features
- assets open correctly
- mobile and desktop acceptable

---

## 23. If rebuilding fast alone

Best practical order:
1. Foundation
2. Auth
3. Profiles
4. Market
5. Events
6. Connect discovery
7. Friendships
8. Friend messaging
9. Marketplace messaging
10. Community posts
11. Notifications
12. Moderation
13. Campus
14. Rate limiting
15. Observability + ops
16. Final UI cleanup

---

## 24. Final summary
If rebuilding NU Atrium from zero, the most important things to preserve are:
- domain separation,
- separate messaging systems,
- RLS-first security,
- quiet premium UI,
- static campus content,
- Redis abuse protection,
- rate-limit event persistence,
- maintenance + metrics routes,
- admin-only internal pages,
- trust-first launch rules.

This file is intended to be sufficient for rebuilding the project in a structured, safe, and realistic way.

