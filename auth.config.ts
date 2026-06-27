import type { NextAuthConfig } from "next-auth";
import Strava from "next-auth/providers/strava";

/**
 * Edge-safe base Auth.js config (no Node APIs / no crypto), used by the
 * middleware for session checks. The Strava provider here carries no real
 * credentials — those are injected per-request in `auth.ts` from the user's
 * encrypted cookie. Optional env values act only as a fallback.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/signin" },
  providers: [
    Strava({
      clientId: process.env.AUTH_STRAVA_ID ?? "",
      clientSecret: process.env.AUTH_STRAVA_SECRET ?? "",
      authorization: { params: { scope: "read" } },
    }),
  ],
} satisfies NextAuthConfig;
