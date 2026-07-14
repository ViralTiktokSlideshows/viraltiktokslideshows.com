import { Bookmark } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <ComingSoon
      icon={Bookmark}
      title="Saved is coming soon"
      description="Bookmark slideshows you want to revisit — this is on the way."
    />
  );
}
