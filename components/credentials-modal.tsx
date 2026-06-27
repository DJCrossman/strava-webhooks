"use client";

import { useState } from "react";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface CredsStatus {
  configured: boolean;
  clientId: string | null;
  verifyToken: string | null;
}

interface Props {
  /** When false the modal cannot be dismissed (no creds configured yet). */
  dismissible: boolean;
  initial: CredsStatus | null;
  onClose: () => void;
  onSaved: (status: CredsStatus, subscription: unknown) => void;
  onDisconnected: () => void;
}

// Mounted only while open (see Dashboard) so each open starts fresh from props.
export function CredentialsModal({
  dismissible,
  initial,
  onClose,
  onSaved,
  onDisconnected,
}: Props) {
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState(initial?.verifyToken ?? "");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, verifyToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save credentials.");
        return;
      }
      toast.success("Credentials saved.");
      onSaved(
        { configured: true, clientId: data.clientId, verifyToken: data.verifyToken },
        data.subscription,
      );
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/credentials", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to disconnect.");
        return;
      }
      toast.success("Credentials forgotten.");
      onDisconnected();
    } catch {
      toast.error("Network error — could not reach the server.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
    >
      <DialogContent showCloseButton={dismissible} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Strava API credentials</DialogTitle>
          <DialogDescription>
            Enter the credentials for the Strava app whose webhook you want to
            manage.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <ShieldCheck />
          <AlertDescription>
            Encrypted and stored only in your browser cookie — never on a server,
            never in a database. The client secret is never sent back to the
            browser.
          </AlertDescription>
        </Alert>

        <a
          href="https://www.strava.com/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-strava hover:underline"
        >
          Find your API credentials on Strava
          <ExternalLink className="size-3.5" />
        </a>

        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="12345"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={
                initial?.configured
                  ? "Re-enter to update (hidden for security)"
                  : "Your app's client secret"
              }
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verifyToken">Verify Token</Label>
            <Input
              id="verifyToken"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="A string you choose, e.g. STRAVA"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setVerifyToken(crypto.randomUUID())}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" />
              Generate a random token
            </button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {initial?.configured && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={disconnect}
                disabled={disconnecting || saving}
              >
                {disconnecting ? <Loader2 className="animate-spin" /> : <Unplug />}
                Disconnect
              </Button>
            )}
            {dismissible && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? "Verifying…" : "Save credentials"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
