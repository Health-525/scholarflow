"use client";

import { Sun } from "lucide-react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { SettingsSection } from "@/components/ui/settings-section";
import type { ThemeValue } from "@/types";

import { THEME_OPTIONS } from "../types";

interface ThemeSectionProps {
  theme: ThemeValue;
  onChange: (theme: ThemeValue) => void;
}

export function ThemeSection({ theme, onChange }: ThemeSectionProps) {
  return (
    <SettingsSection icon={<Sun className="w-4 h-4" />} title="外观">
      <SegmentedControl
        options={THEME_OPTIONS.map((opt) => ({
          id: opt.value,
          label: opt.label,
          icon: opt.Icon,
        }))}
        value={theme}
        onChange={(id) => onChange(id as ThemeValue)}
      />
    </SettingsSection>
  );
}
