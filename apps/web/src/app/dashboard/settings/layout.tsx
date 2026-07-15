import type { Metadata } from "next";

// page.tsx below is a client component (account edit, billing portal
// redirect, generation-default toggles, delete-account dialog), so
// metadata lives here instead — same pattern as generate/success,
// generate/error, generate/checkout, auth/error, dashboard/saved,
// dashboard/help.
export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
