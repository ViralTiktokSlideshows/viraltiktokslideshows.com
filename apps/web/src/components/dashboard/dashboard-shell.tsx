"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/lib/auth-client";

import { AppFrame } from "./app-frame";
import { Sidebar } from "./sidebar";

// Strict auth guard for /dashboard/* — unlike the generate flow, there's
// nothing useful to show a signed-out visitor here (it's their purchase
// history), so this redirects instead of degrading gracefully.
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(`/signup?callbackURL=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, user, router, pathname]);

  if (isPending || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppFrame sidebar={<Sidebar variant="expanded" usage={user.plan} />}>
      {children}
    </AppFrame>
  );
}
