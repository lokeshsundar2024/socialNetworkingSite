import { api } from "@/lib/api";

export type Author = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type Post = {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  author: Author;
  hashtags: string[];
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  bookmarked_by_me: boolean;
};

export type LikeState = { like_count: number; liked_by_me: boolean };
export type BookmarkState = { bookmarked_by_me: boolean };

export type FeedPage = { items: Post[]; next_cursor: string | null };

function pageQuery(cursor?: string | null, limit = 20): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function fetchFeed(
  cursor?: string | null,
  scope: "all" | "following" = "all",
): Promise<FeedPage> {
  return api<FeedPage>(`/posts?${pageQuery(cursor)}&scope=${scope}`);
}

export function fetchBookmarks(cursor?: string | null): Promise<FeedPage> {
  return api<FeedPage>(`/bookmarks?${pageQuery(cursor)}`);
}

export function fetchPost(id: string): Promise<Post> {
  return api<Post>(`/posts/${id}`);
}

export function createPost(content: string): Promise<Post> {
  return api<Post>("/posts", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function deletePost(id: string): Promise<void> {
  return api<void>(`/posts/${id}`, { method: "DELETE" });
}

export function likePost(id: string): Promise<LikeState> {
  return api<LikeState>(`/posts/${id}/like`, { method: "POST" });
}

export function unlikePost(id: string): Promise<LikeState> {
  return api<LikeState>(`/posts/${id}/like`, { method: "DELETE" });
}

export function bookmarkPost(id: string): Promise<BookmarkState> {
  return api<BookmarkState>(`/posts/${id}/bookmark`, { method: "POST" });
}

export function unbookmarkPost(id: string): Promise<BookmarkState> {
  return api<BookmarkState>(`/posts/${id}/bookmark`, { method: "DELETE" });
}

export function fetchUserPosts(
  username: string,
  cursor?: string | null,
): Promise<FeedPage> {
  return api<FeedPage>(
    `/users/${encodeURIComponent(username)}/posts?${pageQuery(cursor)}`,
  );
}

export function fetchMyLikes(cursor?: string | null): Promise<FeedPage> {
  return api<FeedPage>(`/me/likes?${pageQuery(cursor)}`);
}

export function fetchSearchPosts(
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
  return api<FeedPage>(
    `/hashtags/${encodeURIComponent(tag)}/posts?${pageQuery(cursor)}`,
  );
}
