"use client";

import { Link2, Lock, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { EditProfileForm } from "@/components/edit-profile-form";
import { FollowButton } from "@/components/follow-button";
import { HomeFeed } from "@/components/home-feed";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchProfile,
  setPrivate,
  type FollowState,
  type Profile,
} from "@/lib/social";
import { cn } from "@/lib/utils";

type Tab = "posts" | "likes" | "saved";

const TAB_LABELS: Record<Tab, string> = {
  posts: "Posts",
  likes: "Likes",
  saved: "Saved",
};
const FEED_MODE = {
  posts: "user",
  likes: "likes",
  saved: "bookmarks",
} as const;

export function ProfileView() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError(null);
    setEditing(false);
    setTab("posts");
    fetchProfile(username)
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "This user doesn't exist."
            : "Could not load this profile.",
        );
      });
    return () => {
      active = false;
    };
  }, [username]);

  function handleFollowChange(next: FollowState) {
    setProfile((p) => {
      if (!p) return p;
      const was = p.follow_state === "FOLLOWING";
      const now = next === "FOLLOWING";
      return {
        ...p,
        follow_state: next,
        followers_count: p.followers_count + (now ? 1 : 0) - (was ? 1 : 0),
      };
    });
  }

  async function togglePrivate() {
    if (!profile || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await setPrivate(!profile.is_private);
      // Going public approves waiting requests, so the counts can change: reload them
      setProfile(await fetchProfile(username));
    } catch {
      setNotice("Could not update your privacy setting. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const isSelf = profile?.follow_state === "SELF";
  const locked =
    !!profile &&
    profile.is_private &&
    profile.follow_state !== "SELF" &&
    profile.follow_state !== "FOLLOWING";
  const tabs: Tab[] = isSelf ? ["posts", "likes", "saved"] : ["posts"];

  return (
    <div>
      <div className="sticky top-14 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0">
        <h1 className="text-lg font-semibold">
          {profile ? profile.display_name : "Profile"}
        </h1>
        {profile && (
          <p className="text-xs text-muted-foreground">
            {profile.posts_count} {profile.posts_count === 1 ? "post" : "posts"}
          </p>
        )}
      </div>

      {error && <p className="p-6 text-sm text-muted-foreground">{error}</p>}
      {!profile && !error && (
        <p className="p-6 text-sm text-muted-foreground">Loading...</p>
      )}

      {profile && (
        <>
          <div className="h-28 bg-gradient-to-r from-muted to-muted/40" />
          <div className="px-4 pb-4">
            <div className="-mt-10 flex items-end justify-between">
              <Avatar
                name={profile.display_name}
                className="size-20 border-4 border-background text-2xl"
              />
              {isSelf ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditing((e) => !e)}
                  >
                    {editing ? "Cancel" : "Edit profile"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/requests">Follow requests</Link>
                  </Button>
                </div>
              ) : (
                <FollowButton
                  username={profile.username}
                  state={profile.follow_state as FollowState}
                  onChange={handleFollowChange}
                />
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.display_name}</h2>
                {profile.is_private && (
                  <Lock
                    className="size-4 text-muted-foreground"
                    aria-label="Private account"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            </div>

            {profile.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm">{profile.bio}</p>
            )}

            {(profile.location || profile.website) && (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <Link
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Link2 className="size-4" />
                    {profile.website.replace(/^https?:\/\//, "")}
                  </Link>
                )}
              </p>
            )}

            <p className="mt-3 text-sm text-muted-foreground">
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-2 flex gap-4 text-sm">
              <span>
                <strong>{profile.following_count}</strong>{" "}
                <span className="text-muted-foreground">Following</span>
              </span>
              <span>
                <strong>{profile.followers_count}</strong>{" "}
                <span className="text-muted-foreground">
                  {profile.followers_count === 1 ? "Follower" : "Followers"}
                </span>
              </span>
            </p>

            {isSelf && editing && (
              <EditProfileForm
                profile={profile}
                onSaved={(updated) => {
                  setProfile(updated);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            )}

            {isSelf && (
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={profile.is_private}
                  onChange={togglePrivate}
                  disabled={saving}
                />
                <span>
                  <span className="font-medium">Private account</span>
                  <br />
                  <span className="text-muted-foreground">
                    Only approved followers can follow you and see your posts.
                  </span>
                </span>
              </label>
            )}
            {notice && <p className="mt-2 text-sm text-red-600">{notice}</p>}
          </div>

          {locked ? (
            <div className="border-t p-6 text-center text-sm text-muted-foreground">
              This account is private. Follow to see their posts.
            </div>
          ) : (
            <>
              <div className="flex border-y">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 border-b-2 py-3 text-sm font-medium transition-colors hover:bg-muted/60",
                      tab === t
                        ? "border-foreground"
                        : "border-transparent text-muted-foreground",
                    )}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
              {/* key remounts the feed so each tab (and each profile) starts clean */}
              <HomeFeed
                key={`${username}:${tab}`}
                mode={FEED_MODE[tab]}
                username={profile.username}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
