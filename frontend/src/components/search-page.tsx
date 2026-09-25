"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface SearchInputProps {
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  initialValue = "",
  autoFocus = false,
}: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery === initialValue) {
      setIsPending(false);
      return;
    }

    if (debouncedQuery.trim().length === 0) {
      setIsPending(false);
      return;
    }

    router.push(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
    setIsPending(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value !== debouncedQuery) {
      setIsPending(true);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search users, posts, hashtags..."
        value={query}
        onChange={handleChange}
        autoFocus={autoFocus}
        className="pl-9 pr-9"
      />
      {isPending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
