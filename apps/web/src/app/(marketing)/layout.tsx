import Header from "@/components/header";

// Marketing-only shell (landing page today). Everything under the app
// dashboard/generate flow and the auth pages intentionally lives outside
// this group so they don't get the public nav — they build their own
// shell (AuthSplitShell, DashboardShell, etc).
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
