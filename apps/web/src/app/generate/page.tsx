import { Suspense } from "react";

import { GenerateFlow } from "@/components/generate/generate-flow";

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateFlow />
    </Suspense>
  );
}
