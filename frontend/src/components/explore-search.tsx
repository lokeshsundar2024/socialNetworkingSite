"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { HomeFeed } from "@/components/home-feed";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  hashtagPath,
  searchHashtags,
  searchUsers,
  type HashtagResult,
} from "@/lib/search";
import type { UserSummary } from "@/lib/social";
import { cn } from "@/lib/utils";

type Tab = "people" | "posts" | "tags";

const TABS: { id: Tab; label: string }[] = [
  { id: "people", label: "People" },
  { id: "posts", label: "Posts" },
  { id: "tags", label: "Tags" },
];

function parseTab(value: string | null): Tab {
  return value === "posts" || value === "tags" ? value : "people";
}

export function ExploreSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const committed = params.get("q") ?? "";

  const [draft, setDraft] = useState(committed);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [tags, setTags] = useState<HashtagResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  // Keep the URL in sync after the user pauses typing so the query is shareable
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = draft.trim();
      if (next === committed) return;
      const qs = new URLSearchParams();
      if (next) qs.set("q", next);
      if (tab !== "people") qs.set("tab", tab);
      const suffix = qs.toString();
      router.replace(suffix ? `/explore?${suffix}` : "/explore", {
        scroll: false,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, committed, tab, router]);

  useEffect(() => {
    if (tab === "posts") return;
    const q =
      tab === "people"
        ? committed.trim().replace(/^@/, "")
        : committed.trim().replace(/^#/, "");
    if (!q) {
      setUsers([]);
      setTags([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    const request =
      tab === "people" ? searchUsers(q) : searchHashtags(q);
    request
      .then((rows) => {
        if (!active) return;
        if (tab === "people") setUsers(rows as UserSummary[]);
        else setTags(rows as HashtagResult[]);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Could not run that search",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [committed, tab, retry]);

  function selectTab(next: Tab) {
    const qs = new URLSearchParams();
    if (committed) qs.set("q", committed);
    if (next !== "people") qs.set("tab", next);
    const suffix = qs.toString();
    router.replace(suffix ? `/explore?${suffix}` : "/explore", { scroll: false });
  }

  const showEmptyPrompt = !committed.trim();
  const postsReady = committed.trim().length >= 2;

  return (
    <div>
      <div className="sticky top-14 z-10 border-b bg-background/90 backdrop-blur md:top-0">
        <h1 className="px-4 pt-3 text-lg font-semibold">Explore</h1>
        <div className="px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search people, posts, or #hashtags"
            aria-label="Search"
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
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

      {showEmptyPrompt && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Search for people, posts, and hashtags.
        </p>
      )}

      {!showEmptyPrompt && tab === "posts" && !postsReady && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Type at least 2 characters to search posts.
        </p>
      )}

      {!showEmptyPrompt && tab === "posts" && postsReady && (
        <HomeFeed key={committed} mode="search" query={committed.trim()} />
      )}

      {!showEmptyPrompt && tab === "people" && (
        <PeopleResults
          users={users}
          loading={loading}
          error={error}
          onRetry={() => setRetry((n) => n + 1)}
        />
      )}

      {!showEmptyPrompt && tab === "tags" && (
        <TagResults
          tags={tags}
          loading={loading}
          error={error}
          onRetry={() => setRetry((n) => n + 1)}
        />
      )}
    </div>
  );
}

function PeopleResults({
  users,
  loading,
  error,
  onRetry,
}: {
  users: UserSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (loading && users.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Searching...
      </p>
    );
  }
  if (!loading && users.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        No people match that search.
      </p>
    );
  }
  return (
    <div>
      {users.map((u) => (
        <Link
          key={u.id}
          href={`/u/${u.username}`}
          className="flex items-center gap-3 border-b p-4 hover:bg-muted/40"
        >
          <Avatar name={u.display_name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{u.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{u.username}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TagResults({
  tags,
  loading,
  error,
  onRetry,
}: {
  tags: HashtagResult[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (loading && tags.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Searching...
      </p>
    );
  }
  if (!loading && tags.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        No hashtags match that search.
      </p>
    );
  }
  return (
    <div>
      {tags.map((item) => (
        <Link
          key={item.tag}
          href={hashtagPath(item.tag)}
          className="flex items-center justify-between gap-3 border-b p-4 hover:bg-muted/40"
        >
          <span className="text-sm font-semibold">#{item.tag}</span>
          <span className="text-xs text-muted-foreground">
            {item.post_count} {item.post_count === 1 ? "post" : "posts"}
          </span>
        </Link>
      ))}
    </div>
  );
}
