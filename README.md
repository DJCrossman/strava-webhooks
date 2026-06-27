# Strava Webhook Dashboard

A clean, open-source dashboard for managing your [Strava Webhook Events API](https://developers.strava.com/docs/webhooks/) subscription — **create, view, and delete** the subscription for your Strava app from a browser instead of `curl`.

- 🔐 **Sign in with Strava** (OAuth via [Auth.js](https://authjs.dev))
- 🧑‍🤝‍🧑 **Multi-tenant, bring-your-own-credentials** — every user manages their own Strava app
- 🗄️ **No database** — per-user credentials are encrypted (AES-256-GCM) and stored only in an httpOnly session cookie
- ▲ **Deploys to Vercel** in a couple of clicks, or run it with **Docker**
- 🎨 Strava-inspired UI

> **Not affiliated with or endorsed by Strava.** "Strava" and the Strava logo are trademarks of Strava, Inc. This project uses the Strava API in accordance with their [API Agreement](https://www.strava.com/legal/api) and [brand guidelines](https://developers.strava.com/guidelines/).

---

## How it works

This is a **management console**, not a webhook *receiver*. It does not host a callback endpoint, store events, or require a tunnel. The Next.js server simply relays create / view / delete calls to the Strava API on your behalf and shows you the results.

**Credentials are entered in the UI — no Strava env vars.** On the sign-in screen you enter your Strava app's **Client ID** and **Client Secret**. The app validates them against Strava, stores them encrypted in an httpOnly cookie, and uses them to run the "Connect with Strava" OAuth sign-in. That same app is then used to manage its webhook subscription. The only deployment-side requirement is `AUTH_SECRET`.

> ℹ️ Your Strava app must have its **Authorization Callback Domain** set to the domain where this dashboard runs (`localhost` for local dev, `your-app.vercel.app` in production). Strava allows only one callback domain per app.

> ⚠️ **Creating a subscription requires a live callback.** When you click *Create*, Strava immediately sends a validation `GET` to the callback URL you entered and expects it to echo `hub.challenge`. Creation only succeeds if that URL is already deployed and responding — that's your own app's job. View and delete have no such requirement.

---

## Prerequisites

1. An `AUTH_SECRET` — generate with `openssl rand -base64 32`.
2. A **Strava API application** (yours, created at <https://www.strava.com/settings/api>) whose **Authorization Callback Domain** matches where you'll run this dashboard — `localhost` for local dev, or `your-app.vercel.app` in production (domain only, no scheme or path). You'll enter its Client ID/Secret in the UI, not in env.

---

## Run locally

```bash
cp .env.example .env      # set AUTH_SECRET (and AUTH_URL=http://localhost:3000 for plain HTTP)
npm install
npm run dev
```

Open <http://localhost:3000>, enter your Strava app's Client ID and Secret, and click **Connect with Strava**.

## Run with Docker

```bash
cp .env.example .env      # set AUTH_SECRET and AUTH_URL=http://localhost:3000
docker compose up --build
```

The app is served on <http://localhost:3000>. No volumes are needed — there's nothing to persist on disk.

## Deploy to Vercel

1. Push this repo to GitHub and import it into Vercel (zero config — it's a standard Next.js app).
2. Add a single environment variable in the Vercel project settings: `AUTH_SECRET`.
3. Make sure your Strava app's **Authorization Callback Domain** is your Vercel domain (e.g. `your-app.vercel.app`).
4. Deploy, open the site, and enter your Strava app credentials.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | ✅ | Signs the session and encrypts the credential cookie. `openssl rand -base64 32`. |
| `AUTH_URL` | optional | Set when serving over plain HTTP (e.g. `http://localhost:3000`) so cookies aren't marked Secure. Not needed on HTTPS hosts like Vercel. |
| `AUTH_STRAVA_ID` | optional | Pre-seed a default login app instead of entering it in the UI. |
| `AUTH_STRAVA_SECRET` | optional | Client secret for the optional pre-seeded login app. |

---

## Security & data

- The Strava app credentials you enter are encrypted with AES-256-GCM (key derived from `AUTH_SECRET`) and stored **only** in an httpOnly cookie. They are never written to disk, never sent to a database, and the **client secret is never returned to the browser**.
- Because there's no database, credentials are re-entered if the cookie is cleared or the session expires (~30 days), and they don't sync across devices/browsers. This is the intended trade-off of the no-DB design.

## Tech stack

Next.js (App Router) · Auth.js v5 · Tailwind CSS v4 · shadcn/ui · TypeScript

## License

[MIT](./LICENSE)
