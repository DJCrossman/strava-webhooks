import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CREDS_COOKIE,
  credsCookieOptions,
  encryptCreds,
  getCreds,
  type ManagedCreds,
} from "@/lib/creds";
import { viewSubscription } from "@/lib/strava";

/** Status of the saved credentials. Never returns the client secret. */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const creds = await getCreds();
  return NextResponse.json({
    configured: Boolean(creds),
    clientId: creds?.clientId ?? null,
    verifyToken: creds?.verifyToken ?? null,
  });
}

/**
 * Validate credentials against Strava, then store them in the encrypted cookie.
 * Runs BEFORE sign-in (the /signin form posts here), so it requires no session;
 * it only ever sets the caller's own cookie.
 */
export async function POST(request: Request) {
  let body: Partial<ManagedCreds>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  const clientSecret = body.clientSecret?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "clientId and clientSecret are required." },
      { status: 400 },
    );
  }

  // verifyToken is only needed to CREATE a subscription. Keep an existing one,
  // use a provided one, otherwise generate a random token.
  const existing = await getCreds();
  const verifyToken =
    body.verifyToken?.trim() || existing?.verifyToken || crypto.randomUUID();

  const creds: ManagedCreds = { clientId, clientSecret, verifyToken };

  // Validate by calling Strava's View endpoint — proves the id/secret are valid.
  const result = await viewSubscription(creds);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.status === 401 || result.status === 400
            ? `Strava rejected these credentials: ${result.error}`
            : result.error,
      },
      { status: 400 },
    );
  }

  const res = NextResponse.json({
    configured: true,
    clientId,
    verifyToken,
    subscription: result.data,
  });
  res.cookies.set(CREDS_COOKIE, encryptCreds(creds), credsCookieOptions());
  return res;
}

/** Forget the saved credentials. */
export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ configured: false });
  res.cookies.delete(CREDS_COOKIE);
  return res;
}
