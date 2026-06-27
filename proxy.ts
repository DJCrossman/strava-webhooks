import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe Auth.js instance for the middleware (session check only). It uses
// the base config without the Node-only dynamic credential lookup in auth.ts.
const { auth } = NextAuth(authConfig);

/**
 * Gate the dashboard: unauthenticated visitors are redirected to /signin.
 * API routes are excluded from the matcher so they can return JSON 401s.
 */
export default auth((req) => {
  const isSignin = req.nextUrl.pathname === "/signin";
  if (!req.auth && !isSignin) {
    const url = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(url);
  }
  if (req.auth && isSignin) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
