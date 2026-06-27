"use client";

import { useState } from "react";
import { Loader2, Send, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  hasSubscription: boolean;
  defaultOwnerId: string | null;
}

interface TestResult {
  ok: boolean;
  status?: number;
  response?: string;
  error?: string;
  payload?: unknown;
}

export function TestEventPanel({ hasSubscription, defaultOwnerId }: Props) {
  const [objectType, setObjectType] = useState("activity");
  const [aspectType, setAspectType] = useState("create");
  const [objectId, setObjectId] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwnerId ?? "");
  const [updates, setUpdates] = useState('{"title":"New title"}');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    let parsedUpdates: Record<string, string> | undefined;
    if (aspectType === "update") {
      try {
        parsedUpdates = JSON.parse(updates || "{}");
      } catch {
        setResult({ ok: false, error: "Updates must be valid JSON." });
        setSending(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/test-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectType,
          aspectType,
          objectId,
          ownerId,
          updates: parsedUpdates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error, status: res.status });
        return;
      }
      setResult(data);
      if (data.ok) toast.success(`Callback responded ${data.status}.`);
      else toast.warning(`Callback responded ${data.status}.`);
    } catch {
      setResult({ ok: false, error: "Network error — could not send." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle>Send a test event</CardTitle>
        <CardDescription>
          POSTs a simulated Strava webhook payload to your subscription&apos;s
          callback URL — useful for testing your receiver.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasSubscription ? (
          <Alert>
            <Info />
            <AlertDescription>
              Create a subscription first — test events are sent to its callback
              URL.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Object type</Label>
                <Select
                  value={objectType}
                  onValueChange={(v) => setObjectType(v ?? "activity")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">activity</SelectItem>
                    <SelectItem value="athlete">athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Aspect type</Label>
                <Select
                  value={aspectType}
                  onValueChange={(v) => setAspectType(v ?? "create")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">create</SelectItem>
                    <SelectItem value="update">update</SelectItem>
                    <SelectItem value="delete">delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="objectId">
                  {objectType === "athlete" ? "Athlete ID" : "Activity ID"}
                </Label>
                <Input
                  id="objectId"
                  inputMode="numeric"
                  value={objectId}
                  onChange={(e) => setObjectId(e.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ownerId">Athlete ID</Label>
                <Input
                  id="ownerId"
                  inputMode="numeric"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  placeholder="Your athlete ID"
                />
              </div>
            </div>

            {aspectType === "update" && (
              <div className="space-y-1.5">
                <Label htmlFor="updates">Updates (JSON)</Label>
                <Textarea
                  id="updates"
                  value={updates}
                  onChange={(e) => setUpdates(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <Button type="submit" disabled={sending || !objectId || !ownerId}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
              {sending ? "Sending…" : "Send test event"}
            </Button>

            {result && (
              <Alert variant={result.ok ? "default" : "destructive"}>
                <AlertDescription>
                  {result.error ? (
                    result.error
                  ) : (
                    <div className="space-y-1">
                      <div>
                        Callback responded with status{" "}
                        <strong>{result.status}</strong>.
                      </div>
                      {result.response && (
                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                          {result.response}
                        </pre>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
