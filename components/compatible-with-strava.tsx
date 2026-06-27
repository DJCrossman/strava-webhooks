import { StravaLogo } from "@/components/strava-logo";

/**
 * "Compatible with Strava" attribution required by Strava's brand guidelines
 * for third-party apps using their API.
 */
export function CompatibleWithStrava() {
  return (
    <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
      <StravaLogo className="h-3.5 w-3.5 text-strava" />
      <span>Compatible with Strava</span>
    </div>
  );
}
