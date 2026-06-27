import type { Metadata } from "next";
import { headers } from "next/headers";
import { ConnectForm } from "@/components/connect-form";
import { CompatibleWithStrava } from "@/components/compatible-with-strava";
import { StravaLogo } from "@/components/strava-logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in — Strava Webhook Dashboard",
};

export default async function SignInPage() {
  // Strava's Authorization Callback Domain is domain-only (no port/scheme).
  const host = (await headers()).get("host") ?? "";
  const callbackDomain = host.split(":")[0];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-strava-light">
              <StravaLogo className="size-7 text-strava" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Strava Webhook Dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your Strava app credentials to sign in and manage its Webhook
              Events API subscription.
            </p>
          </div>
          <ConnectForm callbackDomain={callbackDomain} />
        </CardContent>
      </Card>
      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        This is an open-source tool and is not affiliated with or endorsed by
        Strava.
      </p>
      <div className="mt-4">
        <CompatibleWithStrava />
      </div>
    </div>
  );
}
