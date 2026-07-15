import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@viraltiktokslideshows/ui/components/button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with viraltiktokslideshows — support, billing questions, or feedback.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Get in touch</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
        Questions about a slideshow, a payment, or just feedback — we read everything that comes
        in.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl bg-void p-6 text-bone">
          <p className="font-display text-lg font-bold">Email us</p>
          <p className="mt-2 text-sm text-bone/70">
            The fastest way to reach us. Typical reply: under a few hours.
          </p>
          <Button
            className="mt-5 w-full justify-center gap-1.5 bg-spark text-primary-foreground hover:bg-spark/90"
            nativeButton={false}
            render={<a href="mailto:support@viraltiktokslideshows.com" />}
          >
            <Mail className="size-4" data-icon="inline-start" />
            support@viraltiktokslideshows.com
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-display text-lg font-bold text-foreground">Billing &amp; refunds</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Every unlock is a one-time $2 payment processed by Dodo Payments. Refund requests go
            to the email above and are handled case by case.
          </p>
          <p className="mt-4 font-display text-lg font-bold text-foreground">Common questions</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the{" "}
            <Link href="/#faq" className="text-foreground hover:underline">
              FAQ
            </Link>{" "}
            first — most questions about pricing, formats, and how generation works are answered
            there.
          </p>
        </div>
      </div>
    </main>
  );
}
