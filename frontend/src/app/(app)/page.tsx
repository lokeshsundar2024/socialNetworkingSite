"use client";

import { useState } from "react";
import { HomeFeed } from "@/components/home-feed";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "For you" },
  { id: "following", label: "Following" },
] as const;

export default function HomePage() {
  const [tab, setTab] = useState<"all" | "following">("all");

  return (
    <div>
      <div className="sticky top-14 z-10 border-b bg-background/90 backdrop-blur md:top-0">
        <h1 className="px-4 pt-3 text-lg font-semibold">Home</h1>
        <div className="mt-2 flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 border-b-2 py-3 text-sm font-medium transition-colors hover:bg-muted/60",
                tab === t.id
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* key remounts the feed so each tab starts from a clean state */}
      <HomeFeed key={tab} mode={tab === "following" ? "following" : "home"} />
    </div>
  );
}
