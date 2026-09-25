import { api } from "@/lib/api";
import type { Author } from "@/lib/posts";

export type PostComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: Author;
  reply_count: number;
};

export type CommentPage = { items: PostComment[]; next_cursor: string | null };

function pageQuery(cursor?: string | null, limit = 20): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

export function fetchComments(
  postId: string,
  cursor?: string | null,
): Promise<CommentPage> {
  return api<CommentPage>(`/posts/${postId}/comments?${pageQuery(cursor)}`);
}

export function fetchReplies(
  commentId: string,
  cursor?: string | null,
): Promise<CommentPage> {
  return api<CommentPage>(
    `/comments/${commentId}/replies?${pageQuery(cursor)}`,
  );
}

export function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<PostComment> {
  return api<PostComment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parent_id: parentId ?? null }),
  });
}

export function deleteComment(id: string): Promise<void> {
  return api<void>(`/comments/${id}`, { method: "DELETE" });
}
