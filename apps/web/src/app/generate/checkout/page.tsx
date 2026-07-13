"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AuthSplitShell,
  GoogleAuthButton,
  MagicLinkForm,
  OrDivider,
} from "@/components/auth/auth-split-layout";
import { useSession } from "@/lib/auth-client";
import {
  clearPendingSlideshow,
  createCheckoutSession,
  readPendingSlideshow,
  type PendingSlideshow,
} from "@/lib/checkout-client";

// Mode 2 of the auth screen: reached from UnlockStep when a signed-out user
// clicks "Unlock for $2". The slideshow they were about to buy was stashed
// in sessionStorage first (see checkout-client.ts). Google/magic-link both
// redirect back to this exact page as their callbackURL, so once a session
// cookie lands here we pick the pending slideshow back up and fire the Dodo
// checkout automatically — no extra click needed after signing in.
export default function GenerateCheckoutPage() {
  const router = useRouter();
  const { user, isPending } = useSession();
  const [slideshow, setSlideshow] = useState<PendingSlideshow | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSlideshow(readPendingSlideshow());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isPending || !user || !slideshow || isRedirecting) return;

    setIsRedirecting(true);
    createCheckoutSession(slideshow)
      .then(({ checkoutUrl }) => {
        clearPendingSlideshow();
        window.location.href = checkoutUrl;
      })
      .catch((err) => {
        setIsRedirecting(false);
        setError(err instanceof Error ? err.message : "Could not start checkout. Try again.");
      });
  }, [hydrated, isPending, user, slideshow, isRedirecting]);

  useEffect(() => {
    // Nothing to check out — either it was never set (direct visit) or it
    // was already cleared after a successful checkout call. Either way
    // there's no reason to stay on this page.
    if (hydrated && !slideshow) {
      router.replace("/generate");
    }
  }, [hydrated, slideshow, router]);

  const callbackURL =
    typeof window !== "undefined" ? `${window.location.origin}/generate/checkout` : "/generate/checkout";

  if (!hydrated || !slideshow) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!slideshow) return null;

  return (
    <AuthSplitShell
      leftPanel={
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex flex-col gap-1.5 p-5 text-left">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Your slideshow
              </span>
              <p className="font-display text-lg leading-snug font-bold text-foreground">
                {slideshow.hook}
              </p>
              <p className="text-sm text-muted-foreground">{slideshow.slideCount} slides</p>
            </div>
            <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-spark" />
                No watermark
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-spark" />
                Yours forever
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
              <span className="text-sm font-medium text-foreground">One-time unlock</span>
              <span className="font-display text-lg font-bold text-foreground">$2</span>
            </div>
          </div>
        </div>
      }
    >
      {isRedirecting ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Taking you to checkout…</p>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold text-foreground">Sign in and pay $2</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to unlock your slideshow — you&apos;ll pay $2 right after.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <GoogleAuthButton label="Continue with Google & pay $2" callbackURL={callbackURL} />
            <OrDivider />
            <MagicLinkForm
              buttonLabel="Sign in & pay"
              helperText="We'll email you a secure sign-in link, then take you straight to checkout."
              callbackURL={callbackURL}
            />
          </div>

          {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

          <p className="mt-6 text-xs text-muted-foreground">
            Payments are processed securely by DodoPayments. By continuing you agree to our{" "}
            <a href="#" className="text-riot hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-riot hover:underline">
              Privacy policy
            </a>
            .
          </p>
        </>
      )}
    </AuthSplitShell>
  );
}
