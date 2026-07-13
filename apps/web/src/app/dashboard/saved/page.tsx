import { Bookmark } from "lucide-react";

import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function SavedPage() {
  return (
    <ComingSoon
      icon={Bookmark}
      title="Saved is coming soon"
      description="Bookmark slideshows you want to revisit — this is on the way."
    />
  );
}
