"use client";

import { useRef } from "react";
import { bookmarkPost, unbookmarkPost, type Post } from "@/lib/posts";

// Shared by every screen that shows posts: updates the UI instantly,
// then syncs with the server and rolls back on failure.
export function useBookmarkToggle(
  update: (postId: string, bookmarked: boolean) => void,
  onError: (message: string) => void,
) {
  const pending = useRef(new Set<string>());

  return async function toggleBookmark(post: Post) {
    if (pending.current.has(post.id)) return; // ignore clicks while a request is in flight
    pending.current.add(post.id);
    const next = !post.bookmarked_by_me;
    update(post.id, next);
    try {
      const state = next
        ? await bookmarkPost(post.id)
        : await unbookmarkPost(post.id);
      update(post.id, state.bookmarked_by_me);
    } catch {
      update(post.id, post.bookmarked_by_me);
      onError("Could not update the bookmark. Try again.");
    } finally {
      pending.current.delete(post.id);
    }
  };
}
