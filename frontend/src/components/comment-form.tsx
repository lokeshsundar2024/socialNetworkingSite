"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 1000;

export function CommentForm({
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onClose,
}: {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (content: string) => Promise<void>;
  onClose?: () => void; // shows a Cancel button; also called after a successful submit
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LENGTH - text.length;
  const canSubmit = text.trim().length > 0 && remaining >= 0 && !pending;

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(text.trim());
      setText("");
      onClose?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the server",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-lg border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <span
          className={cn(
            "mr-auto text-xs",
            remaining < 0 ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {remaining <= 200 ? remaining : ""}
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {pending ? "Sending..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
