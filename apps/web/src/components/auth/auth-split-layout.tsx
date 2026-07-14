"use client";

import { Mail, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Input } from "@viraltiktokslideshows/ui/components/input";

import { signInWithGoogle } from "@/lib/auth-client";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

// Shared shell for every auth screen in the app (direct signup, the
// generate-flow "sign in & pay" step, and anything else that needs an
// account) — same two-column split, same header, same Google/magic-link
// primitives. Each screen only supplies its own left-panel illustration and
// right-panel copy/CTA labels.

export function AuthSplitShell({
  leftPanel,
  children,
}: {
  leftPanel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-10 bg-background px-6 py-10 sm:px-10 lg:py-14">
        <AuthBrandHeader />
        <div className="flex flex-1 flex-col justify-center">{leftPanel}</div>
      </div>
      <div className="flex items-center justify-center border-t border-border bg-card px-6 py-10 sm:px-10 lg:border-t-0 lg:border-l">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

export function AuthBrandHeader() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-2xl bg-void">
        <span className="size-2.5 rotate-45 rounded-[2px] bg-spark" />
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-foreground">
        viraltiktokslideshows
      </span>
    </Link>
  );
}

export function GoogleAuthButton({
  label,
  callbackURL,
  disabled,
}: {
  label: string;
  callbackURL: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full justify-center gap-2.5"
      disabled={disabled}
      onClick={() => signInWithGoogle(callbackURL)}
    >
      <Image src="/icons8-google-48.png" alt="" width={18} height={18} />
      {label}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">OR</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function MagicLinkForm({
  buttonLabel,
  helperText,
  callbackURL,
}: {
  buttonLabel: string;
  helperText: string;
  callbackURL: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetRef = useRef<TurnstileWidgetHandle>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !turnstileToken) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const { sendMagicLink } = await import("@/lib/auth-client");
      await sendMagicLink(email.trim(), callbackURL, turnstileToken);
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      // Turnstile tokens are single-use — get a fresh one before the next attempt.
      setTurnstileToken(null);
      widgetRef.current?.reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="auth-email"
          className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Email
        </label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="auth-email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading" || status === "sent"}
            required
            className="pl-10"
          />
        </div>
      </div>

      <TurnstileWidget ref={widgetRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={status === "loading" || status === "sent" || !email.trim() || !turnstileToken}
      >
        <Sparkles className="size-4" data-icon="inline-start" />
        {status === "sent" ? "Check your email" : buttonLabel}
      </Button>

      {status === "sent" ? (
        <p className="text-xs text-muted-foreground">
          Link sent to <span className="font-medium text-foreground">{email}</span> — it expires in
          15 minutes.
        </p>
      ) : status === "error" ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </form>
  );
}
