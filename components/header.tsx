"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StravaLogo } from "@/components/strava-logo";

interface Props {
  name: string | null | undefined;
  image: string | null | undefined;
  onSettings: () => void;
}

export function Header({ name, image, onSettings }: Props) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-strava-light">
            <StravaLogo className="size-4 text-strava" />
          </span>
          <span className="font-semibold tracking-tight">Webhook Dashboard</span>
        </div>

        <div className="flex items-center gap-1">
          {image && (
            <Image
              src={image}
              alt={name ?? "Athlete"}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <span className="mr-1 hidden text-sm font-medium sm:inline">
            {name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            title="Credentials"
            aria-label="Credentials"
          >
            <Settings />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
