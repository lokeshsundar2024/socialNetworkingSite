import { api } from "@/lib/api";
import type { UserSummary } from "@/lib/social";
import type { FeedPage } from "@/lib/posts";

export type HashtagResult = { tag: string; post_count: number };

export function searchUsers(q: string): Promise<UserSummary[]> {
  return api<UserSummary[]>(`/search/users?q=${encodeURIComponent(q)}`);
}

export function searchHashtags(q: string): Promise<HashtagResult[]> {
  return api<HashtagResult[]>(`/search/hashtags?q=${encodeURIComponent(q)}`);
}

export function searchPosts(
  q: string,
  cursor?: string | null,
): Promise<FeedPage> {
  const params = new URLSearchParams({ q, limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return api<FeedPage>(`/search/posts?${params}`);
}

export function fetchHashtagPosts(
  tag: string,
  cursor?: string | null,
): Promise<FeedPage> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return api<FeedPage>(`/hashtags/${encodeURIComponent(tag)}/posts?${params}`);
}
