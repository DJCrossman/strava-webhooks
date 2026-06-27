import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreds } from "@/lib/creds";
import {
  createSubscription,
  deleteSubscription,
  viewSubscription,
} from "@/lib/strava";

const NO_CREDS = NextResponse.json(
  { error: "Strava credentials are not configured." },
  { status: 400 },
);

async function requireSession() {
  const session = await auth();
  return session
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** View the current subscription (or null). */
export async function GET() {
  const unauth = await requireSession();
  if (unauth) return unauth;

  const creds = await getCreds();
  if (!creds) return NO_CREDS;

  const result = await viewSubscription(creds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ subscription: result.data ?? null });
}

/** Create a subscription. The callback URL must be live and pass Strava's handshake now. */
export async function POST(request: Request) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  const creds = await getCreds();
  if (!creds) return NO_CREDS;

  let body: { callbackUrl?: string; verifyToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const callbackUrl = body.callbackUrl?.trim();
  if (!callbackUrl) {
    return NextResponse.json({ error: "callbackUrl is required." }, { status: 400 });
  }
  if (callbackUrl.length > 255) {
    return NextResponse.json(
      { error: "callbackUrl must be 255 characters or fewer." },
      { status: 400 },
    );
  }
  try {
    new URL(callbackUrl);
  } catch {
    return NextResponse.json(
      { error: "callbackUrl must be a valid absolute URL." },
      { status: 400 },
    );
  }

  const verifyToken = body.verifyToken?.trim() || creds.verifyToken;
  const result = await createSubscription(creds, callbackUrl, verifyToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ subscription: result.data }, { status: 201 });
}

/** Delete the current subscription. */
export async function DELETE(request: Request) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  const creds = await getCreds();
  if (!creds) return NO_CREDS;

  // Allow an explicit ?id=, otherwise look up the single existing subscription.
  const url = new URL(request.url);
  let id = Number(url.searchParams.get("id"));

  if (!id) {
    const current = await viewSubscription(creds);
    if (!current.ok) {
      return NextResponse.json({ error: current.error }, { status: 502 });
    }
    if (!current.data) {
      return NextResponse.json(
        { error: "There is no subscription to delete." },
        { status: 404 },
      );
    }
    id = current.data.id;
  }

  const result = await deleteSubscription(creds, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ deleted: true, id });
}
