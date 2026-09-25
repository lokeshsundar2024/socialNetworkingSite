"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { followUser, unfollowUser, type FollowState } from "@/lib/social";

export function FollowButton({
  username,
  state,
  onChange,
}: {
  username: string;
  state: FollowState;
  onChange: (state: FollowState) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function click() {
    if (pending) return;
    if (state === "FOLLOWING" && !window.confirm(`Unfollow @${username}?`))
      return;
    setPending(true);
    setError(null);
    try {
      // The server decides the result: a private account turns a follow into a request
      const result =
        state === "NONE"
          ? await followUser(username)
          : await unfollowUser(username);
      onChange(result.state);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the server",
      );
    } finally {
      setPending(false);
    }
  }

  const label =
    state === "NONE"
      ? "Follow"
      : state === "PENDING"
        ? "Requested"
        : "Following";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={state === "NONE" ? "default" : "outline"}
        onClick={click}
        disabled={pending}
      >
        {pending ? "..." : label}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
