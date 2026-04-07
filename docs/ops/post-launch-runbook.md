# NU Atrium — Post-Launch Runbook

## Status

* Release state: **launch-ready**
* Scope rule: **freeze scope**
* Rule for next work: **no new feature cycle unless real usage shows a concrete need**
* Rollback-first candidate: **`saved_jobs` UI surface**, because it is narrow and isolated relative to the rest of the app. 

## Core surfaces to monitor

### Product

* auth and session flow
* marketplace browse / item / messages
* events browse / detail / RSVP
* communities browse / detail / requests / posts
* people / friends / friend messages
* jobs / job detail / save-unsave / saved jobs
* notifications

### Admin / ops

* `/profile/moderation`
* `/profile/metrics`
* `/api/health`
* cleanup cron
* metrics cron

These are all part of the current intended operating model. 

## Privacy-critical checks

Watch specifically for:

* hidden community membership leakage
* hidden or draft event RSVP leakage
* saved jobs visibility leakage
* any non-admin access to admin pages

These are high-priority because the handoff explicitly marks them as critical privacy/admin constraints. 

## First 24 hours checklist

### 1. Auth

* sign up works
* login works
* logout works
* session persists correctly
* authenticated routes load without random redirects

### 2. Marketplace

* listing detail loads
* seller messaging works
* my listings render correctly
* saved/watch surfaces still behave correctly

### 3. Events

* event detail loads
* RSVP state updates correctly
* my events and saved events reflect real state

### 4. Communities

* community detail loads
* membership/request flow works
* posts visibility is correct

### 5. Jobs

* save from `/jobs/[id]`
* unsave from `/jobs/[id]`
* `/jobs/saved` loads
* only currently visible public jobs appear there

### 6. Admin / ops

* admin can access `/profile/moderation`
* admin can access `/profile/metrics`
* non-admin cannot access either
* `/api/health` responds correctly
* cleanup cron runs with correct auth
* metrics cron runs with correct auth

## Error watchlist

Check for:

* repeated 401 / 403 / 500 responses
* Supabase permission/RLS failures
* missing env-related failures
* Redis / rate-limit failures
* Sentry spikes
* broken deep links from notifications
* save/unsave inconsistencies

## Severity rules

### P0 — immediate action

* auth broken
* privacy leak
* admin access leak
* major create/send/save flow broken
* health/cron failure affecting stability

Action:

* hotfix immediately
* if issue is isolated to `saved_jobs`, disable that UI surface first

### P1 — same day fix

* notification errors
* incorrect counters/states
* broken deep links
* intermittent message/thread issues
* non-blocking but frequent UI breakage

### P2 — batch for v2

* polish issues
* copy issues
* weak empty states
* low-frequency edge cases
* ranking/discovery improvements

## Rollback notes

### Narrow rollback option

If needed, disable:

* save/unsave button on job detail
* `/jobs/saved` navigation entry/page access

Do this before considering broader rollback, because the rest of the system is already considered launch-safe. 

## Week 1 routine

### Daily

* check health endpoint
* check Sentry/errors
* check cron success
* verify admin pages still load
* spot-check one saved job flow
* spot-check one private visibility case

### End of week 1

Prepare:

* top 5 user friction points
* top 3 error classes
* top 3 most-used routes
* decision: hotfix only, or start narrow v2 batch

## Rules for v2 planning

Only prioritize work that comes from:

* observed user friction
* repeated errors
* real usage concentration
* privacy/safety hardening

Do **not** expand into:

* recruiter dashboards
* application tracking
* waitlists
* check-in systems
* reminders
* recommendation engines
* broad analytics suites
* AI features by default 

## Release log

Fill this in manually:

* Release tag:
* Commit SHA:
* Production URL:
* Launch date:
* Admin account verified:
* Health endpoint checked:
* Cleanup cron checked:
* Metrics cron checked:
* Saved jobs checked:
* Privacy checks passed:
* First week owner:
