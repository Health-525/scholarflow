"use client";

import { X } from "lucide-react";
import { useState, useCallback } from "react";

import { cn } from "@/lib/utils";

interface TagBarProps {
  tags: string[];
  allTags: { tag: string; count: number }[];
  onTagsChange: (tags: string[]) => void;
}

export function TagBar({ tags, allTags, onTagsChange }: TagBarProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || tags.includes(trimmed)) return;
      onTagsChange([...tags, trimmed]);
      setInput("");
      setShowSuggestions(false);
      setActiveIndex(-1);
    },
    [tags, onTagsChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addTag(suggestions[activeIndex].tag);
      } else {
        addTag(input);
      }
      return;
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
    // Reset active index on text input
    setActiveIndex(-1);
  };

  const suggestions = allTags
    .filter(
      (t) =>
        !tags.includes(t.tag) &&
        t.tag.toLowerCase().includes(input.toLowerCase())
    )
    .slice(0, 5);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap min-h-7">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full hover:bg-primary/15 p-0.5 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-20">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="输入标签后按回车添加"
            className="w-full h-6 text-xs bg-transparent border-0 border-b border-transparent focus:border-primary focus:outline-none placeholder:text-muted-foreground/50"
          />
          {showSuggestions && input && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-sm p-1 min-w-36">
              <div className="px-2 py-1 text-xs text-muted-foreground/60">建议标签</div>
              <div className="divide-y divide-border/30">
              {suggestions.map((s, i) => (
                <button
                  key={s.tag}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s.tag)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 text-xs rounded text-foreground",
                    i === activeIndex ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <span>{s.tag}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </button>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
