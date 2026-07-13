import type { Metadata } from "next";

import { SlideDeck } from "@/components/landing/slide-deck";
import {
  AuthSplitShell,
  GoogleAuthButton,
  MagicLinkForm,
  OrDivider,
} from "@/components/auth/auth-split-layout";

export const metadata: Metadata = {
  title: "Sign up — Viral Tiktok Slideshows",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const params = await searchParams;
  const callbackURL = params.callbackURL || "/";

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
        <a href="#" className="text-riot hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="#" className="text-riot hover:underline">
          Privacy policy
        </a>
        .
      </p>
    </AuthSplitShell>
  );
}
