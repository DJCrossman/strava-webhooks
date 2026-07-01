# Contributor & agent notes

Strava Webhook Dashboard — a management console for the [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/). See [README.md](./README.md) for setup, features, and deployment.

## Project conventions (Next.js 16, App Router)

- Middleware lives in **`proxy.ts`** (Next 16 renamed it from `middleware.ts`).
- Tailwind **v4** is configured in `app/globals.css` — there is no `tailwind.config.*`.
- UI uses **shadcn/ui** (Base UI-based) in `components/ui/`.
- If an API differs from an older Next.js you may know, check `node_modules/next/dist/docs/` and heed deprecation notices.

## Architecture

- **Auth is split across the edge/node boundary:** `auth.config.ts` is edge-safe and used by `proxy.ts`; `auth.ts` runs on Node and builds the Strava OAuth provider per-request from the user's encrypted cookie.
- **No database.** Per-user Strava credentials are encrypted (AES-256-GCM) and stored only in an httpOnly cookie — see `lib/creds.ts`. All Strava API calls are proxied server-side (`lib/strava.ts`) so the client secret never reaches the browser.
- **Only `AUTH_SECRET` is required** as an environment variable. Never commit real env values — `.env` is gitignored; `.env.example` is the template.

## Local development

```bash
cp .env.example .env   # set AUTH_SECRET; add AUTH_URL=http://localhost:3000 for plain HTTP
npm install
npm run dev
```
