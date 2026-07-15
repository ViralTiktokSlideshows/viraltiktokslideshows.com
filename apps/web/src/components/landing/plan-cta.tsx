"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";

import { type PlanTier, useSession } from "@/lib/auth-client";
import { subscribeToPlan } from "@/lib/settings-client";

// Same sign-in-then-resume pattern as /generate/upgrade — signed-in
// visitors go straight to a Dodo subscription checkout, signed-out
// visitors are sent to sign in first with the tier carried in the
// callback URL, then bounced to /generate/upgrade to finish there (that
// page owns the auto-resume logic once signed in).
export function PlanCTA({
  tier,
  featured,
}: {
  tier: PlanTier;
  featured: boolean;
}) {
  const router = useRouter();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");

    if (!user) {
      const callbackURL = `/generate/upgrade?tier=${tier}`;
      router.push(`/signup?callbackURL=${encodeURIComponent(callbackURL)}`);
      return;
    }

    setLoading(true);
    try {
      await subscribeToPlan(tier);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Could not start checkout. Try again.");
    }
  }

  return (
    <div className="mt-2">
      <Button
        variant={featured ? "default" : "outline"}
        className={
          featured
            ? "w-full justify-center bg-spark text-void hover:bg-spark/90"
            : "w-full justify-center"
        }
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
        Subscribe
      </Button>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
