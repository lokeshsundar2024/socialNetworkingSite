"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params.tag);

  return (
    <div>
      <div className="sticky top-14 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0">
        <Link
          href="/explore"
          aria-label="Back to Explore"
          className="rounded-full p-1 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">#{tag}</h1>
      </div>
      <HomeFeed mode="hashtag" tag={tag} />
    </div>
  );
}
