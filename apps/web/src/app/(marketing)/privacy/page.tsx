import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Viral TikTok Slideshows collects, why, and who it's shared with — your account, the ideas you type, payment metadata, and the third-party services that power generation.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "1. What this covers",
    body: `This policy explains what data viraltiktokslideshows.com (the "Service") collects, why, and who it's shared with. It's written to match how the Service actually works today, not generic boilerplate.`,
  },
  {
    title: "2. Information we collect",
    body: `Account info: your email address, and — if you sign in with Google — your name and profile picture from Google.

What you type: the "idea" text you submit to generate a slideshow, and the resulting slide text and images.

Payment metadata: when you unlock a slideshow, Dodo Payments (our payment processor) handles the transaction. We receive confirmation that payment succeeded and basic order metadata — never your full card number.

Technical data: your IP address (used for rate limiting and bot detection via Cloudflare Turnstile), and a session cookie that keeps you signed in.`,
  },
  {
    title: "3. How we use it",
    body: `To generate your slideshow, process payment, keep you signed in, prevent abuse of the free preview (rate limiting + Turnstile), send you magic-link sign-in emails, and fulfil support requests.`,
  },
  {
    title: "4. Who we share it with",
    body: `We use third-party services to run the Service. Each only receives what it needs to do its job:

OpenRouter / Google Gemini — receives your idea text to generate slide copy.
Ideogram — receives slide text to generate background images.
Cloudflare R2 — stores the generated images so they don't expire.
Cloudflare Turnstile — receives your browser/IP signals to verify you're not a bot.
Dodo Payments — processes your $2 unlock payment.
Google — provides Google Sign-In if you choose that option.
Our email provider (Spacemail) — delivers magic-link sign-in emails.

We don't sell your data, and we don't share it with anyone else for advertising purposes.`,
  },
  {
    title: "5. Data retention",
    body: `We keep your account and unlocked slideshows for as long as your account exists. Free-preview slideshows that are never unlocked aren't tied to an account and aren't retained beyond what's needed to serve that session. You can ask us to delete your account and associated data at any time.`,
  },
  {
    title: "6. Cookies",
    body: `We use a session cookie to keep you signed in. We don't use third-party advertising or tracking cookies.`,
  },
  {
    title: "7. Your rights",
    body: `Depending on where you live, you may have rights to access, correct, export, or delete your personal data. Email us and we'll act on it — for most requests that means deleting your account and everything tied to it.`,
  },
  {
    title: "8. Children's privacy",
    body: `The Service isn't directed at children under 13 (or the equivalent minimum age in your region), and we don't knowingly collect data from them.`,
  },
  {
    title: "9. Security",
    body: `We use standard safeguards (encrypted connections, hashed/short-lived auth tokens, no password storage since sign-in is Google OAuth or a one-time email link) but no system is 100% secure — we can't guarantee absolute security of your data.`,
  },
  {
    title: "10. Changes to this policy",
    body: `If we make material changes, we'll update the date below. Continued use of the Service after changes means you accept the updated policy.`,
  },
  {
    title: "11. Contact",
    body: `Questions about this policy or your data: support@viraltiktokslideshows.com.`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated July 14, 2026</p>

      <p className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This is a general template covering how the Service actually works, not a substitute for
        legal advice — have a lawyer review it before relying on it for compliance purposes (e.g.
        GDPR/CCPA obligations specific to your user base).
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
