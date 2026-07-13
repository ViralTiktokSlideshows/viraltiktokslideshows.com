import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings is coming soon"
      description="Account details, email preferences, and billing history will live here."
    />
  );
}
