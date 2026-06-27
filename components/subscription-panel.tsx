"use client";

import { useState } from "react";
import {
  Loader2,
  Trash2,
  Plus,
  CheckCircle2,
  Info,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface Subscription {
  id: number;
  callback_url: string;
  created_at?: string;
  updated_at?: string;
  resource_state?: number;
}

interface Props {
  subscription: Subscription | null;
  loading: boolean;
  defaultVerifyToken: string | null;
  onRefresh: () => void;
  onChanged: (subscription: Subscription | null) => void;
}

export function SubscriptionPanel({
  subscription,
  loading,
  defaultVerifyToken,
  onRefresh,
  onChanged,
}: Props) {
  return (
    <Card>
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle>Webhook subscription</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RotateCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading subscription…
          </div>
        ) : subscription ? (
          <SubscriptionDetails subscription={subscription} onChanged={onChanged} />
        ) : (
          <CreateForm defaultVerifyToken={defaultVerifyToken} onChanged={onChanged} />
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionDetails({
  subscription,
  onChanged,
}: {
  subscription: Subscription;
  onChanged: (s: Subscription | null) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch("/api/subscription", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete subscription.");
        return;
      }
      toast.success("Subscription deleted.");
      onChanged(null);
    } catch {
      toast.error("Network error — could not reach the server.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <Badge
        variant="outline"
        className="mb-4 gap-1.5 border-success/30 bg-success/10 text-success"
      >
        <CheckCircle2 />
        Active subscription
      </Badge>

      <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <Row label="Subscription ID" value={String(subscription.id)} mono />
        <Row label="Callback URL" value={subscription.callback_url} mono />
        {subscription.created_at && (
          <Row label="Created" value={formatDate(subscription.created_at)} />
        )}
        {subscription.updated_at && (
          <Row label="Updated" value={formatDate(subscription.updated_at)} />
        )}
      </dl>

      <div className="mt-5">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Delete this subscription?
            </span>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting && <Loader2 className="animate-spin" />}
              Yes, delete
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 />
            Delete subscription
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateForm({
  defaultVerifyToken,
  onChanged,
}: {
  defaultVerifyToken: string | null;
  onChanged: (s: Subscription) => void;
}) {
  const [callbackUrl, setCallbackUrl] = useState("");
  const [verifyToken, setVerifyToken] = useState(defaultVerifyToken ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl, verifyToken: verifyToken || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create subscription.");
        return;
      }
      toast.success("Subscription created.");
      onChanged({ id: data.subscription.id, callback_url: callbackUrl });
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        No subscription exists for this app yet. Strava allows exactly one
        subscription per application.
      </p>

      <Alert className="mt-4 border-strava/30 bg-strava-light">
        <Info className="text-strava" />
        <AlertDescription className="text-foreground">
          When you create a subscription, Strava immediately sends a validation
          request to your callback URL. It must already be live and echo the{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">
            hub.challenge
          </code>{" "}
          value. This tool manages the subscription — it does not host the
          callback.
        </AlertDescription>
      </Alert>

      <form onSubmit={create} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="callbackUrl">Callback URL</Label>
          <Input
            id="callbackUrl"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            placeholder="https://your-app.example.com/webhook"
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="createVerifyToken">Verify Token</Label>
          <Input
            id="createVerifyToken"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value)}
            placeholder="Defaults to your saved verify token"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={creating || !callbackUrl}>
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          {creating ? "Creating…" : "Create subscription"}
        </Button>
      </form>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-sm break-all ${mono ? "font-mono" : ""} sm:text-right`}>
        {value}
      </dd>
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}
