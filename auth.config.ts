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
  callbacks: {
    async jwt({ token, account }) {
      // On sign-in, fetch the numeric athlete id straight from Strava using the
      // access token. token.sub is a random UUID for this provider (not the
      // athlete id), and the OAuth `profile` arrives undefined here — so the
      // direct /athlete call is the reliable source.
      if (account?.access_token) {
        try {
          const res = await fetch("https://www.strava.com/api/v3/athlete", {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          if (res.ok) {
            const athlete = (await res.json()) as { id?: number | string };
            if (athlete?.id != null) {
              (token as Record<string, unknown>).athleteId = String(athlete.id);
            }
          }
        } catch {
          // Non-fatal: the Athlete ID field just won't be pre-filled.
        }
      }
      return token;
    },
    session({ session, token }) {
      // Only use the captured athlete id — never token.sub (a UUID).
      const stored = (token as Record<string, unknown>).athleteId;
      if (session.user && typeof stored === "string") {
        session.user.athleteId = stored;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
