"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface SubjectSelectorProps {
  subjects: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SubjectSelector({
  subjects,
  value,
  onChange,
  placeholder = "新建科目",
  className,
}: SubjectSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const isCustom = value !== "" && !subjects.includes(value);

  const submitCreate = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setDraft("");
    setCreating(false);
  };

  const cancelCreate = () => {
    setDraft("");
    setCreating(false);
  };

  return (
    <div
      role="group"
      aria-label="科目"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {subjects.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active ? "" : s)}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-transparent hover:bg-primary/10 hover:text-primary"
            )}
          >
            {active && <Check className="size-3.5" />}
            {s}
          </button>
        );
      })}

      {isCustom && (
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setCreating(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border bg-primary text-primary-foreground border-primary"
        >
          <Check className="size-3.5" />
          {value}
        </button>
      )}

      {creating ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCreate();
            }
            if (e.key === "Escape") {
              cancelCreate();
            }
          }}
          onBlur={cancelCreate}
          placeholder={placeholder}
          className="h-8 min-w-[8rem] rounded-full border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border bg-secondary text-secondary-foreground border-transparent hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="size-3.5" />
          新建科目
        </button>
      )}
    </div>
  );
}
