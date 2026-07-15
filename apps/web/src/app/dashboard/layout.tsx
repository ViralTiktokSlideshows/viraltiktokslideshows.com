import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Whole section is auth-gated and per-user — noindex covers every child
// route (dashboard/page.tsx and dashboard/[purchaseId]/page.tsx are client
// components and can't export their own metadata, so they inherit this).
export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard | Viral TikTok Slideshows",
    default: "Dashboard | Viral TikTok Slideshows",
  },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
