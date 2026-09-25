import { Suspense } from "react";
import { ExploreSearch } from "@/components/explore-search";

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      }
    >
      <ExploreSearch />
    </Suspense>
  );
}
