"use client";

import Script from "next/script";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { env } from "@viraltiktokslideshows/env/web";

// Drop-in Cloudflare Turnstile widget. The site's widget is configured in
// the Cloudflare dashboard as "Managed" mode, so for most real visitors
// this resolves invisibly (no checkbox, no puzzle) — it just takes a
// moment to hand back a verification token via onVerify. High-risk
// visitors may see a small interactive challenge render in this widget's
// place.
//
// Usage: mount it, wait for onVerify(token), send that token to the server
// alongside the request it's protecting, and verify it there (see
// apps/server/src/lib/turnstile.ts). Tokens are single-use and expire
// after a few minutes — call ref.reset() (or just unmount/remount) to get
// a fresh one after a failed submit.
//
// Current call sites: GeneratingStep (protects the free, unauthenticated
// /api/generate) and MagicLinkForm (protects /api/auth/magic-link).

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    className?: string;
  }
>(function TurnstileWidget({ onVerify, onExpire, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.turnstile,
  );

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetId.current) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    if (!scriptReady || !containerRef.current || widgetId.current || !window.turnstile) return;

    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
      theme: "light",
    });

    return () => {
      if (window.turnstile && widgetId.current) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // Deliberately only re-run when the script becomes ready — onVerify/
    // onExpire are expected to be stable-enough callbacks from the caller,
    // and re-rendering the widget on every callback identity change would
    // throw away in-progress challenges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
});
