import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCreds } from "@/lib/creds";
import { viewSubscription } from "@/lib/strava";

/**
 * Send a SIMULATED Strava webhook event to the active subscription's callback
 * URL. This mimics what Strava POSTs when an activity changes, so you can test
 * your own webhook receiver. We only ever send to the existing subscription's
 * callback (which Strava already validated as publicly reachable).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getCreds();
  if (!creds) {
    return NextResponse.json(
      { error: "Strava credentials are not configured." },
      { status: 400 },
    );
  }

  let body: {
    objectType?: string;
    objectId?: number | string;
    aspectType?: string;
    ownerId?: number | string;
    updates?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const objectType = body.objectType === "athlete" ? "athlete" : "activity";
  const aspectType = ["create", "update", "delete"].includes(
    String(body.aspectType),
  )
    ? String(body.aspectType)
    : "create";
  const objectId = Number(body.objectId);
  const ownerId = Number(body.ownerId);

  if (!objectId) {
    return NextResponse.json(
      { error: "A numeric object ID (e.g. an activity ID) is required." },
      { status: 400 },
    );
  }
  if (!ownerId) {
    return NextResponse.json(
      { error: "A numeric owner ID (your athlete ID) is required." },
      { status: 400 },
    );
  }

  // We need a live subscription to know the callback URL + subscription_id.
  const current = await viewSubscription(creds);
  if (!current.ok) {
    return NextResponse.json({ error: current.error }, { status: 502 });
  }
  if (!current.data) {
    return NextResponse.json(
      { error: "No subscription exists yet — create one first." },
      { status: 400 },
    );
  }

  const payload = {
    object_type: objectType,
    object_id: objectId,
    aspect_type: aspectType,
    updates:
      aspectType === "update" && body.updates ? body.updates : {},
    owner_id: ownerId,
    subscription_id: current.data.id,
    event_time: Math.floor(Date.now() / 1000),
  };

  const callbackUrl = current.data.callback_url;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      callbackUrl,
      payload,
      // Cap the echoed body so a chatty receiver can't bloat the response.
      response: text.slice(0, 2000),
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "Your callback URL did not respond within 10 seconds."
          : "Could not reach your callback URL.",
        callbackUrl,
        payload,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
