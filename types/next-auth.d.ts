import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Strava athlete id (from token.sub). */
      athleteId?: string;
    } & DefaultSession["user"];
  }
}
