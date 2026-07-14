import { HelpCircle } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Help & Support" };

export default function HelpPage() {
  return (
    <ComingSoon
      icon={HelpCircle}
      title="Help & support is coming soon"
      description="For now, email support@viraltiktokslideshows.com and we'll get back to you."
    />
  );
}
