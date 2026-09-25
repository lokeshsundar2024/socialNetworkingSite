"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function MyProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(`/u/${user.username}`);
  }, [user, router]);

  return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
}
