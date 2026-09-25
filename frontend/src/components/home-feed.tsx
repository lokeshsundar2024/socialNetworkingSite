"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useBookmarkToggle } from "@/lib/use-bookmark-toggle";
import {
  deletePost,
  fetchBookmarks,
  fetchFeed,
  fetchMyLikes,
  fetchUserPosts,
  likePost,
  unlikePost,
  type FeedPage,
  type Post,
} from "@/lib/posts";
import { fetchHashtagPosts, searchPosts } from "@/lib/search";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";

type Mode =
  | "home"
  | "following"
  | "bookmarks"
  | "user"
  | "likes"
  | "search"
  | "hashtag";

const EMPTY_TEXT: Record<Mode, string> = {
  home: "No posts yet. Write the first one above.",
  following: "Nothing here yet. Follow people to see their posts in this feed.",
  bookmarks: "No bookmarks yet. Tap the bookmark icon on a post to save it.",
  user: "No posts yet.",
  likes: "Nothing liked yet. Tap the heart on a post to see it here.",
  search: "No posts match that search.",
  hashtag: "No posts with this hashtag yet.",
};

function fetchPage(
  mode: Mode,
  cursor: string | null,
  username?: string,
  query?: string,
  tag?: string,
): Promise<FeedPage> {
  switch (mode) {
    case "bookmarks":
      return fetchBookmarks(cursor);
    case "likes":
      return fetchMyLikes(cursor);
    case "user":
      return fetchUserPosts(username ?? "", cursor);
    case "following":
      return fetchFeed(cursor, "following");
    case "search":
      return searchPosts(query ?? "", cursor);
    case "hashtag":
      return fetchHashtagPosts(tag ?? "", cursor);
    default:
      return fetchFeed(cursor, "all");
  }
}

export function HomeFeed({
  mode = "home",
  username,
  query,
  tag,
}: {
  mode?: Mode;
  username?: string;
  query?: string;
  tag?: string;
}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const liking = useRef(new Set<string>());

  const toggleBookmark = useBookmarkToggle(
    (id, bookmarked) =>
      setPosts((list) =>
        list.map((p) =>
          p.id === id ? { ...p, bookmarked_by_me: bookmarked } : p,
        ),
      ),
    setNotice,
  );

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(mode, cursor, username, query, tag);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.next_cursor);
      setHasMore(page.next_cursor !== null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load posts");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, mode, username, query, tag]);

  // Load the next page whenever the bottom marker scrolls near the viewport
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, error, loadMore]);

  async function handleDelete(id: string) {
    const previous = posts;
    setPosts((p) => p.filter((x) => x.id !== id));
    setNotice(null);
    try {
      await deletePost(id);
    } catch {
      setPosts(previous);
      setNotice("Could not delete the post. Try again.");
    }
  }

  async function handleToggleLike(post: Post) {
    if (liking.current.has(post.id)) return; // ignore clicks while a request is in flight
    liking.current.add(post.id);
    const next = !post.liked_by_me;
    const apply = (liked: boolean, count: number) =>
      setPosts((list) =>
        list.map((x) =>
          x.id === post.id
            ? { ...x, liked_by_me: liked, like_count: count }
            : x,
        ),
      );
    apply(next, Math.max(0, post.like_count + (next ? 1 : -1)));
    try {
      const state = next ? await likePost(post.id) : await unlikePost(post.id);
      apply(state.liked_by_me, state.like_count);
    } catch {
      apply(post.liked_by_me, post.like_count);
      setNotice("Could not update the like. Try again.");
    } finally {
      liking.current.delete(post.id);
    }
  }

  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <div>
      {(mode === "home" || mode === "following") && (
        <Composer onCreated={(post) => setPosts((p) => [post, ...p])} />
      )}
      {notice && <p className="border-b p-3 text-sm text-red-600">{notice}</p>}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          canDelete={isStaff || post.author.id === user?.id}
          onDelete={handleDelete}
          onToggleLike={handleToggleLike}
          onToggleBookmark={toggleBookmark}
        />
      ))}

      {hasMore && !error && (
        <div
          ref={sentinel}
          className="p-6 text-center text-sm text-muted-foreground"
        >
          {loading ? "Loading..." : ""}
        </div>
      )}
      {error && (
        <div className="p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-3" onClick={() => loadMore()}>
            Try again
          </Button>
        </div>
      )}
      {!hasMore && posts.length === 0 && !error && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {EMPTY_TEXT[mode]}
        </p>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="p-6 text-center text-xs text-muted-foreground">
          You&apos;re all caught up.
        </p>
      )}
    </div>
  );
}
