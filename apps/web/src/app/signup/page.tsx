import type { Metadata } from "next";
import Link from "next/link";

import { SlideDeck } from "@/components/landing/slide-deck";
import {
  AuthSplitShell,
  GoogleAuthButton,
  MagicLinkForm,
  OrDivider,
} from "@/components/auth/auth-split-layout";
import { resolveCallbackURL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free account to save your slideshows and generate more.",
  // No unique content beyond auth buttons, and /generate is already the
  // indexed, free-to-try conversion entry point -- avoid a thin duplicate.
  robots: { index: false, follow: true },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const params = await searchParams;
  // Must always come out fully-qualified (https://viraltiktokslideshows.com/...,
  // or http://localhost:3001/... in dev) -- never a bare path. The server
  // redirects back to this URL from its own response after auth completes,
  // so a relative path would resolve against api.viraltiktokslideshows.com
  // instead of the web app. When nothing more specific was requested (e.g.
  // the header's plain "Sign in" link, with no callbackURL param), land the
  // user on /generate -- the actual product -- rather than back on the
  // marketing homepage they just left.
  const callbackURL = await resolveCallbackURL(params.callbackURL, "/generate");

  return (
    <AuthSplitShell
      leftPanel={
        <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
          <SlideDeck />
          <h1 className="mt-8 font-display text-3xl leading-[1.1] font-bold text-balance text-foreground sm:text-4xl">
            Type an idea. Get a viral slideshow.
          </h1>
          <p className="mt-3 text-sm text-balance text-muted-foreground sm:text-base">
            Create an account to save your slideshows and generate more.
          </p>
        </div>
      }
    >
      <h2 className="font-display text-2xl font-bold text-foreground">Create your account</h2>
      <p className="mt-2 text-sm text-muted-foreground">Free to start — no card required.</p>

      <div className="mt-8 flex flex-col gap-4">
        <GoogleAuthButton label="Continue with Google" callbackURL={callbackURL} />
        <OrDivider />
        <MagicLinkForm
          buttonLabel="Send magic link"
          helperText="We'll email you a secure sign-in link — no password to remember."
          callbackURL={callbackURL}
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="text-riot hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-riot hover:underline">
          Privacy policy
        </Link>
        .
      </p>
    </AuthSplitShell>
  );
}
