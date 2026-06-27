"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { StravaLogo } from "@/components/strava-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Sign-in form: collect the user's Strava app Client ID/Secret, validate +
 * store them (encrypted cookie), then start the "Connect with Strava" OAuth
 * flow which uses those same credentials. No environment variables required.
 */
export function ConnectForm({ callbackDomain }: { callbackDomain: string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not validate those credentials.");
        setSubmitting(false);
        return;
      }
      // Credentials are valid and stored — start the OAuth flow.
      await signIn("strava", { callbackUrl: "/" });
    } catch {
      setError("Network error — could not reach the server.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={connect} className="space-y-4 text-left">
      <a
        href="https://www.strava.com/settings/api"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-strava hover:underline"
      >
        Get your Strava API credentials
        <ExternalLink className="size-3.5" />
      </a>

      <div className="space-y-1.5">
        <Label htmlFor="clientId">Client ID</Label>
        <Input
          id="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="12345"
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="clientSecret">Client Secret</Label>
        <Input
          id="clientSecret"
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Your app's client secret"
          autoComplete="off"
          required
        />
      </div>

      <Alert>
        <ShieldCheck />
        <AlertDescription>
          In your Strava app settings, set <strong>Authorization Callback Domain</strong>{" "}
          to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {callbackDomain || "your domain"}
          </code>
          . Your credentials are encrypted and stored only in your browser cookie.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button
        type="submit"
        disabled={submitting || !clientId || !clientSecret}
        className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-strava px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-strava-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strava/40 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <StravaLogo className="size-5" />
        )}
        {submitting ? "Connecting…" : "Connect with Strava"}
      </button>
    </form>
  );
}
