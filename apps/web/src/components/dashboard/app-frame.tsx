import type { ReactNode } from "react";

// Shared floating-card app shell used by both the strict-auth dashboard and
// the auth-conscious generate flow, so the two feel like one app instead of
// two differently-shaped surfaces.
export function AppFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background md:p-4">
      <div className="mx-auto flex min-h-svh w-full max-w-[1400px] flex-col overflow-hidden bg-card md:min-h-[calc(100svh-2rem)] md:flex-row md:rounded-3xl md:border md:border-border md:shadow-sm">
        {sidebar}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
