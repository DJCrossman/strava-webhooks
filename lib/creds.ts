import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

/**
 * Credentials for the Strava application the user manages. Stored encrypted
 * (AES-256-GCM) in an httpOnly cookie — never on disk or a database.
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
  return createHash("sha256").update(secret).digest();
}

export function encryptCreds(creds: ManagedCreds): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(creds), "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function isManagedCreds(v: unknown): v is ManagedCreds {
  const o = v as Record<string, unknown> | null;
  return (
    !!o &&
    typeof o.clientId === "string" &&
    typeof o.clientSecret === "string" &&
    typeof o.verifyToken === "string"
  );
}

export function decryptCreds(value: string): ManagedCreds | null {
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;

    if (isManagedCreds(parsed)) return parsed;

    // Migrate a cookie written by an earlier multi-app build.
    if (Array.isArray(parsed.apps)) {
      const apps = parsed.apps.filter(isManagedCreds);
      const active =
        apps.find((a) => a.clientId === parsed.activeClientId) ?? apps[0];
      return active
        ? {
            clientId: active.clientId,
            clientSecret: active.clientSecret,
            verifyToken: active.verifyToken,
          }
        : null;
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
 * Decrypt credentials from a raw Cookie header — used by the Auth.js config to
 * source the Strava OAuth client_id/secret per request.
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

/**
 * Use Secure cookies only when actually served over HTTPS. This mirrors how
 * Auth.js decides, so the cookie works on http://localhost (local Docker) and
 * stays Secure on HTTPS deployments like Vercel.
 */
function servedOverHttps(): boolean {
  const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (url) return url.startsWith("https://");
  return process.env.NODE_ENV === "production";
}
