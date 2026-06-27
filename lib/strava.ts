import "server-only";
import type { ManagedCreds } from "@/lib/creds";

const ENDPOINT = "https://www.strava.com/api/v3/push_subscriptions";

/** A single Strava push subscription as returned by the View endpoint. */
export interface StravaSubscription {
  id: number;
  application_id?: number;
  callback_url: string;
  created_at?: string;
  updated_at?: string;
  resource_state?: number;
}

export interface StravaResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  /** Human-readable error, distilled from Strava's response body. */
  error?: string;
}

/**
 * Strava error bodies look like:
 *   { "message": "Bad Request", "errors": [{ "resource": "...", "field": "...", "code": "..." }] }
 * Flatten that into a single readable string.
 */
function describeError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const b = body as { message?: string; errors?: Array<Record<string, string>> };
    const parts: string[] = [];
    if (b.message) parts.push(b.message);
    if (Array.isArray(b.errors) && b.errors.length > 0) {
      parts.push(
        b.errors
          .map((e) => [e.resource, e.field, e.code].filter(Boolean).join(" "))
          .filter(Boolean)
          .join("; "),
      );
    }
    if (parts.length > 0) return parts.join(" — ");
  }
  return `Strava request failed (HTTP ${status}).`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** GET the application's subscription (Strava allows at most one). */
export async function viewSubscription(
  creds: ManagedCreds,
): Promise<StravaResult<StravaSubscription | null>> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("client_secret", creds.clientSecret);

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const body = await parseBody(res);

  if (!res.ok) {
    return { ok: false, status: res.status, error: describeError(res.status, body) };
  }
  const list = Array.isArray(body) ? (body as StravaSubscription[]) : [];
  return { ok: true, status: res.status, data: list[0] ?? null };
}

/** Create a subscription. Strava synchronously validates callbackUrl at this moment. */
export async function createSubscription(
  creds: ManagedCreds,
  callbackUrl: string,
  verifyToken: string,
): Promise<StravaResult<{ id: number }>> {
  const form = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    callback_url: callbackUrl,
    verify_token: verifyToken,
  });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const body = await parseBody(res);

  if (!res.ok) {
    return { ok: false, status: res.status, error: describeError(res.status, body) };
  }
  return { ok: true, status: res.status, data: body as { id: number } };
}

/** Delete a subscription by id. Returns 204 with no body on success. */
export async function deleteSubscription(
  creds: ManagedCreds,
  id: number,
): Promise<StravaResult<null>> {
  const url = new URL(`${ENDPOINT}/${id}`);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("client_secret", creds.clientSecret);

  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok) {
    const body = await parseBody(res);
    return { ok: false, status: res.status, error: describeError(res.status, body) };
  }
  return { ok: true, status: res.status, data: null };
}
