import type { ReactNode } from "react";

// Shared, edge-to-edge app shell used by both the strict-auth dashboard and
// the auth-conscious generate flow, so the two feel like one app instead of
// two differently-shaped surfaces. Previously floated as a padded, rounded,
// bordered card with the page background visible around it on desktop --
// removed per feedback that the margin shouldn't show up on dashboard pages.
//
// h-svh (not min-h-svh) pins the outer frame to exactly the viewport height
// so the sidebar and <main> are both bounded by it -- <main>'s
// overflow-y-auto can then actually kick in and scroll on its own. With
// min-h-svh the frame just grew taller than the viewport with the page's
// content, so there was nothing to scroll *inside*; the whole frame
// (sidebar included) scrolled with the page instead of the sidebar staying
// put.
export function AppFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-card md:flex-row">
      {sidebar}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
