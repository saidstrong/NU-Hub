# NU Atrium MVP

Production deployment notes for Vercel + Supabase.

## Vercel env vars
Set these in Vercel for `Production` (and `Preview` if you use preview auth flows):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (recommended for `Production`, e.g. `https://nu-hub.vercel.app`, no trailing slash)
- `SUPABASE_SERVICE_ROLE_KEY` (optional for current MVP; keep server-side only)

Notes:

- If you want auth emails to work on Vercel preview deployments, either leave `NEXT_PUBLIC_APP_URL` unset for `Preview` so request headers are used, or set a preview-specific value.
- Do not point `Preview` at your production domain unless you explicitly want preview auth emails to send users there.

## Supabase Auth URL config
In Supabase Dashboard -> Authentication -> URL Configuration:

1. Set **Site URL** to your production app URL.
2. Add **Redirect URLs** for auth flows, including:
   - `https://<your-production-domain>/auth/confirm`
   - `http://localhost:3000/auth/confirm`
3. If using Vercel preview deployments, add a preview wildcard redirect URL (for example):
   - `https://*.vercel.app/auth/confirm`

## Supabase email template
For SSR auth, update Supabase Dashboard -> Authentication -> Email Templates -> **Confirm signup** to point at the app confirmation route instead of the default hosted link:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Deploy
1. Push to your connected branch.
2. Confirm Vercel build uses:
   - Build command: `npm run build`
   - Output: Next.js default
3. Ensure all Supabase migrations are applied to the production project.

## Post-deploy smoke tests
1. Open `/welcome` while logged out and verify auth pages load.
2. Sign up with an NU email, open the confirmation email, and verify the link returns to `/auth/confirm` and lands in onboarding or the app without an auth error.
3. Log out, log back in, and verify protected routes work (`/home`, `/market`, `/events`, `/connect`, `/profile`, `/search`).
4. Create a listing with and without images and verify detail + card rendering.
5. Submit/join community and event actions, then verify `/profile/notifications` updates.
6. Run a global search query on `/search?q=...` and verify grouped results + links.
