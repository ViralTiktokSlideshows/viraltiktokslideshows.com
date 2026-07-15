import type { ReactNode } from "react";

// Shared, edge-to-edge app shell used by both the strict-auth dashboard and
// the auth-conscious generate flow, so the two feel like one app instead of
// two differently-shaped surfaces. Previously floated as a padded, rounded,
// bordered card with the page background visible around it on desktop --
// removed per feedback that the margin shouldn't show up on dashboard pages.
export function AppFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-card md:flex-row">
      {sidebar}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
