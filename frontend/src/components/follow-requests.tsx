"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  rejectFollowRequest,
  type FollowRequest,
} from "@/lib/social";
import { timeAgo } from "@/lib/time";

export function FollowRequests() {
  const [items, setItems] = useState<FollowRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(fromStart: boolean) {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFollowRequests(fromStart ? null : cursor);
      setItems((prev) => {
        const base = fromStart ? [] : prev;
        const seen = new Set(base.map((r) => r.user.id));
        return [...base, ...page.items.filter((r) => !seen.has(r.user.id))];
      });
      setCursor(page.next_cursor);
      setHasMore(page.next_cursor !== null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load requests",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(request: FollowRequest, accept: boolean) {
    const previous = items;
    setItems((list) => list.filter((r) => r.user.id !== request.user.id));
    setNotice(null);
    try {
      if (accept) await acceptFollowRequest(request.user.username);
      else await rejectFollowRequest(request.user.username);
    } catch {
      setItems(previous);
      setNotice("Could not update the request. Try again.");
    }
  }

  return (
    <div>
      <div className="sticky top-14 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="rounded-full p-1 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Follow requests</h1>
      </div>

      {notice && <p className="border-b p-3 text-sm text-red-600">{notice}</p>}

      {items.map((r) => (
        <div key={r.user.id} className="flex items-center gap-3 border-b p-4">
          <Avatar name={r.user.display_name} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${r.user.username}`}
              className="block truncate text-sm font-semibold hover:underline"
            >
              {r.user.display_name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              @{r.user.username} · {timeAgo(r.requested_at)}
            </p>
          </div>
          <Button size="sm" onClick={() => respond(r, true)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => respond(r, false)}>
            Decline
          </Button>
        </div>
      ))}

      {loading && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Loading...
        </p>
      )}
      {error && (
        <div className="p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => load(items.length === 0)}
          >
            Try again
          </Button>
        </div>
      )}
      {!loading && !error && hasMore && (
        <div className="p-4 text-center">
          <Button variant="outline" onClick={() => load(false)}>
            Load more
          </Button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No pending follow requests.
        </p>
      )}
    </div>
  );
}
