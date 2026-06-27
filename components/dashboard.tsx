"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import {
  CredentialsModal,
  type CredsStatus,
} from "@/components/credentials-modal";
import {
  SubscriptionPanel,
  type Subscription,
} from "@/components/subscription-panel";
import { TestEventPanel } from "@/components/test-event-panel";
import { CompatibleWithStrava } from "@/components/compatible-with-strava";
import { Card } from "@/components/ui/card";

interface Props {
  user: { name?: string | null; image?: string | null; athleteId?: string | null };
}

export function Dashboard({ user }: Props) {
  const [creds, setCreds] = useState<CredsStatus | null>(null);
  const [credsLoaded, setCredsLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const refreshSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      if (res.ok) setSubscription(data.subscription ?? null);
    } finally {
      setSubLoading(false);
    }
  }, []);

  // Load credential status on mount; open the modal if nothing is configured.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/credentials");
        const data: CredsStatus = await res.json();
        setCreds(data);
        if (data.configured) {
          refreshSubscription();
        } else {
          setModalOpen(true);
        }
      } finally {
        setCredsLoaded(true);
      }
    })();
  }, [refreshSubscription]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        name={user.name}
        image={user.image}
        onSettings={() => setModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-10">
        {credsLoaded && creds?.configured ? (
          <>
            <SubscriptionPanel
              subscription={subscription}
              loading={subLoading}
              defaultVerifyToken={creds.verifyToken}
              onRefresh={refreshSubscription}
              onChanged={(s) => setSubscription(s)}
            />

            <TestEventPanel
              hasSubscription={Boolean(subscription)}
              defaultOwnerId={user.athleteId ?? null}
            />
          </>
        ) : (
          <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
            Add your Strava API credentials to get started.
          </Card>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" />
          Your credentials are encrypted and stored only in your browser — never
          on a server.
        </p>
      </main>

      <footer className="border-t border-border py-6">
        <CompatibleWithStrava />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Open source · Not affiliated with or endorsed by Strava.
        </p>
      </footer>

      {modalOpen && (
        <CredentialsModal
          key={String(creds?.configured)}
          dismissible={Boolean(creds?.configured)}
          initial={creds}
          onClose={() => setModalOpen(false)}
          onSaved={(status, sub) => {
            setCreds(status);
            setModalOpen(false);
            setSubscription((sub as Subscription | null) ?? null);
          }}
          onDisconnected={() => {
            setCreds({ configured: false, clientId: null, verifyToken: null });
            setSubscription(null);
          }}
        />
      )}
    </div>
  );
}
