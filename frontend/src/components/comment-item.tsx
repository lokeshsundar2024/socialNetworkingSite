"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { CommentForm } from "@/components/comment-form";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createComment,
  deleteComment,
  fetchReplies,
  type PostComment,
} from "@/lib/comments";
import { timeAgo } from "@/lib/time";

type Props = {
  comment: PostComment;
  postId: string;
  postAuthorId: string;
  isReply?: boolean;
  onReply?: (content: string) => Promise<void>; // replies use their parent's reply handler
  onRemoved: (id: string, removedCount: number) => void;
  onCountChange: (delta: number) => void;
};

export function CommentItem({
  comment,
  postId,
  postAuthorId,
  isReply = false,
  onReply,
  onRemoved,
  onCountChange,
}: Props) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<PostComment[]>([]);
  const [replyCount, setReplyCount] = useState(comment.reply_count);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete =
    !!user &&
    (user.id === comment.author.id ||
      user.id === postAuthorId ||
      user.role === "MODERATOR" ||
      user.role === "ADMIN");

  async function loadReplies() {
    if (loadingReplies) return;
    setLoadingReplies(true);
    setError(null);
    try {
      const page = await fetchReplies(comment.id, loaded ? nextCursor : null);
      setReplies((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...page.items.filter((r) => !seen.has(r.id))];
      });
      setNextCursor(page.next_cursor);
      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load replies",
      );
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!loaded) loadReplies();
  }

  // Top-level comments create replies to themselves
  async function handleReply(content: string) {
    const created = await createComment(postId, content, comment.id);
    setReplyCount((c) => c + 1);
    onCountChange(1);
    setExpanded(true);
    if (loaded && nextCursor === null) setReplies((prev) => [...prev, created]);
    else if (!loaded) await loadReplies(); // fetches the new reply along with the rest
  }

  function handleReplyRemoved(id: string, removedCount: number) {
    setReplies((list) => list.filter((r) => r.id !== id));
    setReplyCount((c) => Math.max(0, c - removedCount));
    onCountChange(-removedCount);
  }

  async function handleDelete() {
    const message = isReply
      ? "Delete this reply?"
      : "Delete this comment and its replies?";
    if (!window.confirm(message)) return;
    try {
      await deleteComment(comment.id);
      onRemoved(comment.id, 1 + replyCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete");
    }
  }

  const submitReply = onReply ?? handleReply;

  return (
    <div className={isReply ? "pt-3" : "border-b p-4"}>
      <div className="flex gap-3">
        <Avatar
          name={comment.author.display_name}
          className={isReply ? "size-8" : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate font-semibold">
              {comment.author.display_name}
            </span>
            <span className="truncate text-muted-foreground">
              @{comment.author.username}
            </span>
            <span className="whitespace-nowrap text-muted-foreground">
              · {timeAgo(comment.created_at)}
            </span>
            {canDelete && (
              <button
                type="button"
                aria-label="Delete"
                className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
            {comment.content}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setReplying((r) => !r)}
            >
              Reply
            </button>
            {!isReply && replyCount > 0 && (
              <button
                type="button"
                className="hover:text-foreground"
                onClick={toggleReplies}
              >
                {expanded
                  ? "Hide replies"
                  : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2">
              <CommentForm
                autoFocus
                placeholder={`Reply to @${comment.author.username}`}
                submitLabel="Reply"
                onSubmit={submitReply}
                onClose={() => setReplying(false)}
              />
            </div>
          )}

          {!isReply && expanded && (
            <div className="mt-1 border-l pl-3">
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  postId={postId}
                  postAuthorId={postAuthorId}
                  isReply
                  onReply={handleReply}
                  onRemoved={handleReplyRemoved}
                  onCountChange={() => {}}
                />
              ))}
              {loadingReplies && (
                <p className="py-2 text-xs text-muted-foreground">Loading...</p>
              )}
              {nextCursor && !loadingReplies && (
                <button
                  type="button"
                  className="py-2 text-xs text-blue-600 hover:underline"
                  onClick={loadReplies}
                >
                  Load more replies
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
