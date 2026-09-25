import { api } from "@/lib/api";

export type FollowState = "NONE" | "PENDING" | "FOLLOWING";
export type RelationState = "SELF" | FollowState;

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_private: boolean;
  follow_state: RelationState;
};

export type UserSummary = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type FollowRequest = { user: UserSummary; requested_at: string };
export type FollowRequestPage = {
  items: FollowRequest[];
  next_cursor: string | null;
};

const enc = encodeURIComponent;

export function fetchProfile(username: string): Promise<Profile> {
  return api<Profile>(`/users/${enc(username)}`);
}

export function followUser(username: string): Promise<{ state: FollowState }> {
  return api<{ state: FollowState }>(`/users/${enc(username)}/follow`, {
    method: "POST",
  });
}

export function unfollowUser(
  username: string,
): Promise<{ state: FollowState }> {
  return api<{ state: FollowState }>(`/users/${enc(username)}/follow`, {
    method: "DELETE",
  });
}

export function fetchFollowRequests(
  cursor?: string | null,
): Promise<FollowRequestPage> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  return api<FollowRequestPage>(`/follow-requests?${params}`);
}

export function acceptFollowRequest(username: string): Promise<void> {
  return api<void>(`/follow-requests/${enc(username)}/accept`, {
    method: "POST",
  });
}

export function rejectFollowRequest(username: string): Promise<void> {
  return api<void>(`/follow-requests/${enc(username)}/reject`, {
    method: "POST",
  });
}

export function setPrivate(
  isPrivate: boolean,
): Promise<{ is_private: boolean }> {
  return api<{ is_private: boolean }>("/me/privacy", {
    method: "PATCH",
    body: JSON.stringify({ is_private: isPrivate }),
  });
}
export type ProfileUpdate = {
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
};

export function updateProfile(input: ProfileUpdate): Promise<Profile> {
  return api<Profile>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
