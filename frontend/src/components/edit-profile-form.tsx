"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { updateProfile, type Profile } from "@/lib/social";

const inputClass =
  "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function EditProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: Profile;
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      // Empty values clear the field on the server
      onSaved(
        await updateProfile({
          display_name: displayName,
          bio,
          location,
          website,
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the server",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border p-4">
      <div>
        <label htmlFor="ep-name" className="mb-1 block text-sm font-medium">
          Display name
        </label>
        <input
          id="ep-name"
          className={inputClass}
          value={displayName}
          maxLength={60}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ep-bio" className="mb-1 block text-sm font-medium">
          Bio{" "}
          <span className="font-normal text-muted-foreground">
            ({300 - bio.length} left)
          </span>
        </label>
        <textarea
          id="ep-bio"
          rows={3}
          maxLength={300}
          className={`${inputClass} resize-none`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ep-location" className="mb-1 block text-sm font-medium">
          Location
        </label>
        <input
          id="ep-location"
          className={inputClass}
          value={location}
          maxLength={100}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="ep-website" className="mb-1 block text-sm font-medium">
          Website
        </label>
        <input
          id="ep-website"
          className={inputClass}
          value={website}
          maxLength={255}
          placeholder="https://example.com"
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={pending || displayName.trim().length === 0}
        >
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
