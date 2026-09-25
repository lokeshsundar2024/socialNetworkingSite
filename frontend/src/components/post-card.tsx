"use client";

import { Bookmark, Heart, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { Post } from "@/lib/posts";
import { hashtagPath } from "@/lib/search";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

function renderContent(text: string) {
  // Splitting on a capture group puts the hashtags at the odd indexes
  return text
    .split(/((?<![\w#])#[A-Za-z][A-Za-z0-9_]{0,49})/g)
    .map((part, i) =>
      i % 2 === 1 ? (
        <Link
          key={i}
          href={hashtagPath(part)}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {part}
        </Link>
      ) : (
        part
      ),
    );
}

export function PostCard({
  post,
  canDelete,
  onDelete,
  onToggleLike,
  onToggleBookmark,
}: {
  post: Post;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onToggleLike: (post: Post) => void;
  onToggleBookmark: (post: Post) => void;
}) {
  return (
    <article className="flex gap-3 border-b p-4">
      <Avatar name={post.author.display_name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/u/${post.author.username}`}
            className="truncate font-semibold hover:underline"
          >
            {post.author.display_name}
          </Link>
          <Link
            href={`/u/${post.author.username}`}
            className="truncate text-muted-foreground hover:underline"
          >
            @{post.author.username}
          </Link>
          <span className="whitespace-nowrap text-muted-foreground">
            · {timeAgo(post.created_at)}
            {post.edited_at ? " (edited)" : ""}
          </span>
          {canDelete && (
            <button
              type="button"
              aria-label="Delete post"
              className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
              onClick={() => {
                if (window.confirm("Delete this post?")) onDelete(post.id);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
          {renderContent(post.content)}
        </p>

        <div className="-ml-2 mt-2 flex items-center gap-1">
          <button
            type="button"
            aria-label={post.liked_by_me ? "Unlike" : "Like"}
            aria-pressed={post.liked_by_me}
            onClick={() => onToggleLike(post)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors hover:bg-muted",
              post.liked_by_me ? "text-red-500" : "text-muted-foreground",
            )}
          >
            <Heart
              className={cn("size-4", post.liked_by_me && "fill-current")}
            />
            <span className="min-w-3 tabular-nums">
              {post.like_count > 0 ? post.like_count : ""}
            </span>
          </button>

          <Link
            href={`/post/${post.id}`}
            aria-label="Comments"
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <MessageCircle className="size-4" />
            <span className="min-w-3 tabular-nums">
              {post.comment_count > 0 ? post.comment_count : ""}
            </span>
          </Link>

          <button
            type="button"
            aria-label={post.bookmarked_by_me ? "Remove bookmark" : "Bookmark"}
            aria-pressed={post.bookmarked_by_me}
            onClick={() => onToggleBookmark(post)}
            className={cn(
              "ml-auto flex items-center rounded-full px-2 py-1 text-sm transition-colors hover:bg-muted",
              post.bookmarked_by_me
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground",
            )}
          >
            <Bookmark
              className={cn("size-4", post.bookmarked_by_me && "fill-current")}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
