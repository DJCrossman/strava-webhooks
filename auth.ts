import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import { authConfig } from "@/auth.config";
import { readCredsFromCookieHeader } from "@/lib/creds";

/**
 * Auth.js with a PER-REQUEST Strava provider. The OAuth client_id/secret are
 * read from the user's encrypted credential cookie (set on the /signin screen),
 * so no Strava environment variables are required. Env values are used only as a
 * fallback when no cookie is present.
 *
 * This file uses Node APIs (via lib/creds) and must NOT be imported by the
 * middleware — the middleware uses the edge-safe `authConfig` instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  const creds = readCredsFromCookieHeader(req?.headers.get("cookie"));
  return {
    ...authConfig,
    providers: [
      Strava({
        clientId: creds?.clientId ?? process.env.AUTH_STRAVA_ID ?? "",
        clientSecret: creds?.clientSecret ?? process.env.AUTH_STRAVA_SECRET ?? "",
        authorization: { params: { scope: "read" } },
      }),
    ],
  };
});
