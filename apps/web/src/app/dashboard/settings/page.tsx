import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings is coming soon"
      description="Account details, email preferences, and billing history will live here."
    />
  );
}
