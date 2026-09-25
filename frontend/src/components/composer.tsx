"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createPost, type Post } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

export function Composer({ onCreated }: { onCreated: (post: Post) => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LENGTH - text.length;
  const canPost = text.trim().length > 0 && remaining >= 0 && !pending;

  async function submit() {
    if (!canPost) return;
    setPending(true);
    setError(null);
    try {
      const post = await createPost(text.trim());
      onCreated(post);
      setText("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the server",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-3 border-b p-4">
      <Avatar name={user?.username ?? "?"} />
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What's happening? Use #hashtags"
          rows={3}
          className="w-full resize-none rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={cn(
              "text-xs",
              remaining < 0 ? "text-red-600" : "text-muted-foreground",
            )}
          >
            {remaining <= 200 ? remaining : ""}
          </span>
          <Button onClick={submit} disabled={!canPost}>
            {pending ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
