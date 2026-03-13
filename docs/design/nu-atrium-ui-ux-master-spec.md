Below is the **NU Atrium UI/UX Master Design Spec** — a practical product design blueprint you can use as the single source of truth while redesigning the website.

This is written as a real product/system spec, not just visual advice.

---

# NU Atrium — UI/UX Master Design Spec

## 1. Product Design Goal

Design NU Atrium as a **premium campus operating system** for students.

It should feel:

* clean
* modern
* trustworthy
* ambitious
* highly structured
* minimal but not empty

The experience should communicate:

> “This is serious software for high-performing students.”

Not:

* playful social app
* student club site
* hackathon demo
* component showcase

---

# 2. Core Product Positioning

## Product role

NU Atrium is not just a marketplace, not just a social app, not just an events app.

It is:

## **A campus utility platform**

where students can:

* discover opportunities
* connect with people
* exchange items
* join communities
* track campus activity

That means the UI must balance:

* utility
* community
* professionalism

---

# 3. Design Principles

These are the rules that should govern every screen.

## 3.1 Clarity first

Every screen should answer in 2–3 seconds:

* where am I?
* what can I do here?
* what matters most?

## 3.2 Premium restraint

Use fewer elements, better arranged.
Do not impress with decoration.
Impress with:

* spacing
* typography
* hierarchy
* precision

## 3.3 Consistency over creativity

A professional product feels expensive because it is consistent.

Same:

* button logic
* card logic
* spacing
* icons
* section rhythm
* typography scale

## 3.4 Action-centered design

Every page needs:

* one main action
* one clear secondary path
* no visual confusion about what to do next

## 3.5 Useful calm

Dark UI should feel calm, not gloomy.
Use contrast and structure to create confidence.

---

# 4. Visual Direction

## Style name

**Quiet Premium Dark**

## Inspiration direction

* Linear: hierarchy and discipline
* Stripe: confidence and spacing
* Notion: simplicity and clarity
* Apple: restraint and polish

## Avoid

* flashy gradients everywhere
* glassmorphism overuse
* too many borders
* too many floating pills
* colorful UI noise
* crowded cards

---

# 5. Brand Rules

## Brand personality

NU Atrium should feel:

* intelligent
* campus-native
* quietly premium
* future-oriented
* structured
* high-trust

## Brand tone

Text should feel:

* calm
* concise
* confident
* informative

Avoid:

* overly promotional copy
* long marketing sentences
* generic startup fluff

---

# 6. Design System Foundations

# 6.1 Color Palette

## Core background colors

* **App Background:** `#0B0F14`
* **Section Surface:** `#111827`
* **Elevated Surface:** `#151D2B`

## Text colors

* **Primary Text:** `#F3F4F6`
* **Secondary Text:** `#9CA3AF`
* **Muted Text:** `#6B7280`

## Accent

* **Primary Accent:** `#4F7CFF`

This accent is used for:

* active tabs
* primary buttons
* focused borders
* selected chips
* links where needed

## Semantic colors

* Success: `#22C55E`
* Warning: `#F59E0B`
* Error: `#EF4444`

## Border colors

* Default border: `rgba(255,255,255,0.08)`
* Stronger border: `rgba(255,255,255,0.12)`
* Hover border: `rgba(255,255,255,0.16)`

## Color usage rules

* One accent only
* No random blue/green/purple mixes
* Cards should not differ in background color too much
* Status colors only for status

---

# 6.2 Typography

## Font family

Use **Inter** everywhere.

## Type scale

* **Hero XL:** `48 / 56`
* **Hero L:** `40 / 48`
* **Page Title:** `32 / 40`
* **Section Title:** `24 / 32`
* **Card Title:** `18 / 24`
* **Body M:** `16 / 24`
* **Body S:** `14 / 20`
* **Caption:** `12 / 16`

## Font weights

* 700 — Hero / primary titles
* 600 — section and card headings
* 500 — labels / emphasis
* 400 — body text

## Typography rules

* Use stronger titles, quieter body
* Avoid making all text semi-bold
* Titles should carry structure, not borders

---

# 6.3 Spacing System

Use an 8px system.

## Tokens

* 4
* 8
* 12
* 16
* 20
* 24
* 32
* 40
* 48
* 64

## Usage

* Micro gap: 8
* Label to field: 8
* Card internal spacing: 20 or 24
* Section spacing: 24 or 32
* Page top spacing: 24 or 32
* Large hero spacing: 40 or 48

## Rule

If spacing is inconsistent, the whole app will feel cheap even if colors are good.

---

# 6.4 Radius

Use a restrained radius system.

* Page-level cards: `24px`
* Content cards: `20px`
* Inputs: `16px`
* Buttons: `16px`
* Chips: `999px`

Do not mix too many radius styles.

---

# 6.5 Shadows

Minimal shadows.

Dark premium UI should rely mostly on:

* contrast
* border
* spacing

Use shadow only for:

* modal
* dropdown
* floating CTA

---

# 7. Component System

# 7.1 Buttons

Use only 3 button types.

## Primary Button

Use for the single main action.

Style:

* filled accent
* white text
* medium-large height
* strong focus ring

Examples:

* Sign up
* Log in
* Create event
* Post listing

## Secondary Button

Use for secondary but important actions.

Style:

* dark surface
* subtle border
* white text

Examples:

* Saved
* Messages
* Settings

## Ghost Button

Use for text-based utility actions.

Examples:

* See all
* Cancel
* View more

## Button rules

* One primary action per section
* Avoid many equal buttons in one row
* Keep labels short

---

# 7.2 Inputs

## Input style

* dark elevated surface
* subtle border
* large internal padding
* strong focus accent border
* placeholder quieter than text

## States

* default
* hover
* focus
* error
* disabled

## Rules

* label always visible
* placeholder should not replace label
* consistent height across forms

---

# 7.3 Cards

Cards should be used for:

* grouping content
* emphasizing content items
* making list items tappable

## Card anatomy

* title
* optional subtitle
* content
* optional actions

## Card rules

* avoid cards inside cards inside cards
* only primary content gets a card
* if everything is a card, nothing feels important

---

# 7.4 Chips / Tags

Chips should be small and quiet.

Use chips only for:

* filters
* content tags
* status labels

Avoid using chips as primary navigation too often.

## Chip styles

* default
* active
* status

---

# 7.5 Navigation

## Bottom navigation

Keep:

* Home
* Market
* Events
* Connect
* Profile

### Required changes

Add icons.
Current text-only nav is usable, but icons will improve scan speed.

Each nav item should have:

* icon
* label
* active state
* inactive state

## Top bar / page hero actions

Limit to 1–2 important actions, 3 max.

---

# 8. Layout System

# 8.1 Page template

Every page should follow:

1. **Hero / Header**
2. **Search or Primary Control**
3. **Main content section 1**
4. **Main content section 2**
5. **Optional secondary sections**
6. **Bottom nav**

## Header rules

Header includes:

* page title
* one-line explanation
* one or two actions max

---

# 8.2 Section template

Each section should have:

* section title
* optional short subtitle
* one content block

Avoid:

* title
* subtitle
* divider
* card
* inner card
* nested pills
* extra label

Too many layers weaken clarity.

---

# 9. Content Rules

# 9.1 Writing rules

All product text should be:

* short
* clear
* helpful
* calm

## Good examples

* “Browse student listings”
* “Find people and communities”
* “Upcoming campus events”
* “No conversations yet”

## Avoid

* “Curated academic and student-led campus events across clubs, career, and workshops”
  when a shorter version would work.

---

# 9.2 Empty state rules

Every empty state should:

* explain what is missing
* explain what happens next
* provide one action

Example:
**No upcoming events**
Upcoming campus events will appear here.
`Browse events`

---

# 10. Page-by-Page Specification

# 10.1 Landing Page

## Goal

Convert visitors to sign-up/login immediately.

## Layout

### Top strip

* logo / wordmark left
* `Skip to app` right

### Hero block

* label: “Campus Utility”
* title: **NU Atrium**
* subtitle: one concise line
* primary CTA: `Create account`
* secondary CTA: `Log in`

### Optional micro-proof row

* Marketplace
* Events
* Communities
* Collaboration

## Remove

* extra inactive text like “Continue to sign in”

---

# 10.2 Login / Sign Up

## Goal

Fast and trusted auth.

## Layout

* title
* one-sentence explanation
* email field
* password field
* primary button
* small secondary link

## UX rules

* reduce dead space
* stronger CTA
* cleaner labels
* error states visible but calm

---

# 10.3 Home Page

## Goal

Show immediate value.

## Order

1. Search
2. Quick Access
3. Featured Market Listings
4. Upcoming Events
5. Suggested People / Communities

## Quick Access

Make it a strong 2x2 grid:

* Market
* Events
* Connect
* Campus

Each tile:

* icon
* label
* short meaning
* strong tap target

## Home content rule

Home should feel like a curated dashboard, not a list of all modules.

---

# 10.4 Market

## Goal

Fast discovery + easy posting.

## Layout

1. Hero
2. Search
3. Filter chips
4. Recent listings
5. Floating/sticky post action

## Listing card

Show:

* thumbnail
* title
* price
* category
* max 2 metadata items

Reduce tag overload.

## CTA

Post listing should be:

* floating button
  or
* sticky action

Current position can be improved.

---

# 10.5 Post Listing

## Goal

Quick, confidence-building form.

## Sections

1. Images
2. Item details
3. Category / condition
4. Price
5. Pickup / location
6. Submit

## Improvements

* cleaner upload area
* stronger hierarchy
* sticky submit on long forms
* better field grouping

---

# 10.6 Events

## Goal

Help students quickly find and create events.

## Layout

1. Hero
2. Search
3. Filter chips
4. Featured / upcoming
5. Event list

## Event card

* title
* date/time
* place
* 1–2 line description
* CTA or RSVP state

## Empty state

Make it smaller and less visually heavy.

---

# 10.7 Connect

## Goal

Discover people and communities.

## Layout

1. Hero
2. Search
3. Discovery filters
4. Suggested people
5. Suggested communities

## People card

* avatar
* name
* major/year
* 2 interests max
* one action

## Communities card

* avatar
* name
* short purpose
* members count
* CTA

---

# 10.8 Profile

## Goal

Make identity feel polished and valuable.

## Layout

1. Hero
2. Profile summary
3. About
4. Academic info
5. Interests/goals
6. Friends / communities later

## Profile summary format

Prefer:
**Said Amanzhol**
Foundation — CPS
NU'30

instead of repeated label stacks.

---

# 10.9 Messaging Pages

## Goal

Readable and calm.

## Inbox

* counterpart avatar
* name
* listing/friend context
* last message preview
* timestamp
* reply state badge if helpful

## Thread

* counterpart header
* simple messages
* timestamp
* input at bottom

No over-designed chat bubbles required.

---

# 11. UX Behavior Rules

# 11.1 Loading states

Every content section should have skeletons.

## Required skeletons

* listings
* events
* people cards
* messages
* profile blocks

---

# 11.2 Motion

Add subtle motion only:

* hover border brighten
* tap scale 0.98
* fade in content
* skeleton pulse
* smooth page transitions

---

# 11.3 Form UX

* show immediate validation
* keep errors close to fields
* disable submit while pending
* show loading text on submit

---

# 12. Accessibility Rules

Minimum required:

* text contrast strong enough
* visible focus states
* large tap targets
* buttons not distinguished by color alone
* labels always present
* icons paired with text when important

---

# 13. Technical Design Tokens

You should define actual tokens like:

## Colors

* `--bg-app`
* `--bg-surface`
* `--bg-elevated`
* `--text-primary`
* `--text-secondary`
* `--accent-primary`
* `--border-default`

## Spacing

* `--space-1: 4px`
* `--space-2: 8px`
* `--space-3: 12px`
* `--space-4: 16px`
* `--space-5: 24px`
* `--space-6: 32px`

## Radius

* `--radius-card`
* `--radius-input`
* `--radius-button`
* `--radius-pill`

This is how real systems stay consistent.

---

# 14. Execution Roadmap

## Phase 1 — Design system

Build:

* colors
* typography
* spacing
* buttons
* inputs
* cards
* nav
* chips

## Phase 2 — High-impact pages

Redesign:

* Landing
* Login
* Home
* Market
* Events
* Connect
* Profile

## Phase 3 — Secondary pages

Redesign:

* Post listing
* Messaging
* Detail pages
* Settings

## Phase 4 — Polish

Add:

* microinteractions
* empty states
* loading states
* skeletons
* iconography

---

# 15. Success Criteria

You will know the redesign is working if:

* every page feels part of one system
* the first 3 seconds are clear
* one main action stands out
* fewer elements compete visually
* screenshots look “expensive” even without animation
* a recruiter or judge says:
  **“This looks like a real startup product.”**

---

# 16. Final recommendation

The best next move is:

## **Turn this spec into an implementation plan**

meaning:

* exact design tokens
* exact component inventory
* exact per-page wireframe structure
* exact UX rules for each module

That is how you go from “good app” to **multibillion-dollar product feel**.

If you want, I can do the next step and create:

# **NU Atrium Implementation Design Plan**

with:

* precise color tokens
* typography tokens
* component inventory
* exact page wireframes
* priority order for redesign

This would be the document you directly implement from.
