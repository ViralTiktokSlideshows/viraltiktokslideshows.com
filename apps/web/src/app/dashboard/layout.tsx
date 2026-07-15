import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Whole section is auth-gated and per-user — noindex covers every child
// route (dashboard/page.tsx 