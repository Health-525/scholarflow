"use client";

import { X } from "lucide-react";
import { useState, useCallback } from "react";

interface TagBarProps {
  tags: string[];
  allTags: { tag: string; count: number }[];
  onTagsChange: (tags: string[]) => void;
}

export function TagBar({ tags, allTags, onTagsChange }: TagBarProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || tags.includes(trimmed)) return;
      onTagsChange([...tags, trimmed]);
      setInput("");
      setShowSuggestions(false);
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
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const suggestions = allTags
    .filter(
      (t) =>
        !tags.includes(t.tag) &&
        t.tag.toLowerCase().includes(input.toLowerCase())
    )
    .slice(0, 5);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full bg-[#F0F5FF] text-[#3370FF] transition-all duration-150"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full hover:bg-[#3370FF]/15 p-0.5 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative">
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
            placeholder={tags.length === 0 ? "添加标签…" : ""}
            className="min-w-[60px] max-w-[120px] h-6 text-xs bg-transparent border-0 border-b border-transparent focus:border-[#3370FF] focus:outline-none placeholder:text-[#C9CDD4] transition-all duration-200"
          />
          {tags.length === 0 && !input && (
              <span className="text-[11px] text-[#C9CDD4]">输入标签后按回车添加</span>
            )}
          {showSuggestions && input && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[#E5E6EB] rounded-lg shadow-lg p-1 min-w-[140px] animate-fade-up">
              <div className="px-2 py-1 text-[11px] text-[#8F959E]">建议标签</div>
              <div className="divide-y divide-[#E5E6EB]/30">
              {suggestions.map((s) => (
                <button
                  key={s.tag}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s.tag)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-[#F0F5FF] text-[#1F2329]"
                >
                  <span>{s.tag}</span>
                  <span className="text-[#8F959E]">{s.count}</span>
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
