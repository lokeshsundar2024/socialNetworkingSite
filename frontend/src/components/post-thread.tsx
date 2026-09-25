"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommentForm } from "@/components/comment-form";
import { CommentItem } from "@/components/comment-item";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createComment, fetchComments, type PostComment } from "@/lib/comments";
import {
  deletePost,
  fetchPost,
  likePost,
  unlikePost,
  type Post,
} from "@/lib/posts";
import { useBookmarkToggle } from "@/lib/use-bookmark-toggle";

export function PostThread() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const liking = useRef(false);
  const toggleBookmark = useBookmarkToggle(
    (_, bookmarked) =>
      setPost((cur) => (cur ? { ...cur, bookmarked_by_me: bookmarked } : cur)),
    setNotice,
  );
  useEffect(() => {
    let active = true;
    fetchPost(id)
      .then((p) => {
        if (active) setPost(p);
      })
      .catch((err) => {
        if (!active) return;
        setPostError(
          err instanceof ApiError && err.status === 404
            ? "This post doesn't exist or was deleted."
            : "Could not load the post.",
        );
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function loadComments(fromStart: boolean) {
    setLoading(true);
    setCommentsError(null);
    try {
      const page = await fetchComments(id, fromStart ? null : cursor);
      setComments((prev) => {
        const base = fromStart ? [] : prev;
        const seen = new Set(base.map((c) => c.id));
        return [...base, ...page.items.filter((c) => !seen.has(c.id))];
      });
      setCursor(page.next_cursor);
      setHasMore(page.next_cursor !== null);
    } catch {
      setCommentsError("Could not load comments.");
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function adjustCount(delta: number) {
    setPost((p) =>
      p ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p,
    );
  }

  async function addComment(content: string) {
    const created = await createComment(id, content);
    adjustCount(1);
    if (hasMore)
      setNotice("Comment posted. Load more comments to see it at the end.");
    else setComments((list) => [...list, created]);
  }

  function handleRemoved(commentId: string, removedCount: number) {
    setComments((list) => list.filter((c) => c.id !== commentId));
    adjustCount(-removedCount);
  }

  async function toggleLike(p: Post) {
    if (liking.current) return;
    liking.current = true;
    const next = !p.liked_by_me;
    const apply = (liked: boolean, count: number) =>
      setPost((cur) =>
        cur ? { ...cur, liked_by_me: liked, like_count: count } : cur,
      );
    apply(next, Math.max(0, p.like_count + (next ? 1 : -1)));
    try {
      const state = next ? await likePost(p.id) : await unlikePost(p.id);
      apply(state.liked_by_me, state.like_count);
    } catch {
      apply(p.liked_by_me, p.like_count);
      setNotice("Could not update the like. Try again.");
    } finally {
      liking.current = false;
    }
  }

  async function removePost(postId: string) {
    try {
      await deletePost(postId);
      router.replace("/");
    } catch {
      setNotice("Could not delete the post. Try again.");
    }
  }

  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <div>
      <div className="sticky top-14 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0">
        <Link
          href="/"
          aria-label="Back to Home"
          className="rounded-full p-1 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Post</h1>
      </div>

      {!post && postError && (
        <p className="p-6 text-sm text-muted-foreground">{postError}</p>
      )}
      {!post && !postError && (
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      )}

      {post && (
        <>
          <PostCard
            post={post}
            canDelete={isStaff || post.author.id === user?.id}
            onDelete={removePost}
            onToggleLike={toggleLike}
            onToggleBookmark={toggleBookmark}
          />
          <div className="border-b p-4">
            <CommentForm
              placeholder="Write a comment"
              submitLabel="Comment"
              onSubmit={addComment}
            />
          </div>
          {notice && (
            <p className="border-b p-3 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              postAuthorId={post.author.id}
              onRemoved={handleRemoved}
              onCountChange={adjustCount}
            />
          ))}

          {loading && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Loading comments...
            </p>
          )}
          {commentsError && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600">{commentsError}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => loadComments(comments.length === 0)}
              >
                Try again
              </Button>
            </div>
          )}
          {loaded && hasMore && !loading && !commentsError && (
            <div className="p-4 text-center">
              <Button variant="outline" onClick={() => loadComments(false)}>
                Load more comments
              </Button>
            </div>
          )}
          {loaded && !loading && !commentsError && comments.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No comments yet. Start the conversation.
            </p>
          )}
        </>
      )}
    </div>
  );
}
