import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

/**
 * The per-user Strava *application* credentials used to manage a webhook
 * subscription. These are stored encrypted (AES-256-GCM) inside an httpOnly
 * cookie — never persisted to disk or a database, and never exposed to the
 * browser. The encryption key is derived from AUTH_SECRET.
 */
export interface ManagedCreds {
  clientId: string;
  clientSecret: string;
  verifyToken: string;
}

export const CREDS_COOKIE = "strava_creds";

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — cannot encrypt credentials.");
  }
  // Derive a stable 32-byte key from the secret.
  return createHash("sha256").update(secret).digest();
}

export function encryptCreds(creds: ManagedCreds): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(creds), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptCreds(value: string): ManagedCreds | null {
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const parsed = JSON.parse(plaintext.toString("utf8"));
    if (
      typeof parsed?.clientId === "string" &&
      typeof parsed?.clientSecret === "string" &&
      typeof parsed?.verifyToken === "string"
    ) {
      return parsed as ManagedCreds;
    }
    return null;
  } catch {
    return null;
  }
}

/** Read and decrypt the managed credentials from the request cookies. */
export async function getCreds(): Promise<ManagedCreds | null> {
  const store = await cookies();
  const value = store.get(CREDS_COOKIE)?.value;
  return value ? decryptCreds(value) : null;
}

/**
 * Decrypt managed credentials from a raw Cookie header. Used by the Auth.js
 * config to source the Strava OAuth client_id/secret per request.
 */
export function readCredsFromCookieHeader(
  header: string | null | undefined,
): ManagedCreds | null {
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CREDS_COOKIE}=`));
  if (!match) return null;
  return decryptCreds(match.slice(CREDS_COOKIE.length + 1));
}

/**
 * Use Secure cookies only when actually served over HTTPS. This mirrors how
 * Auth.js decides, so the cookie works on http://localhost (local Docker) and
 * stays Secure on HTTPS deployments like Vercel.
 */
function servedOverHttps(): boolean {
  const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (url) return url.startsWith("https://");
  // No explicit URL (e.g. Vercel): assume HTTPS in production.
  return process.env.NODE_ENV === "production";
}

export function credsCookieOptions() {
  return {
    httpOnly: true,
    secure: servedOverHttps(),
    sameSite: "lax" as const,
    path: "/",
    // 30 days; users re-enter after expiry (documented trade-off of the no-DB design).
    maxAge: 60 * 60 * 24 * 30,
  };
}
