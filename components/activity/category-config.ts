import { BookOpen, Code, Gamepad2, Globe, HelpCircle, MessageCircle, Settings } from "lucide-react";

import type { Category } from "@/lib/activity-tracker-v3";

export const CATEGORY_ICON: Record<Category, typeof Code> = {
  coding: Code,
  browsing: Globe,
  study: BookOpen,
  entertainment: Gamepad2,
  communication: MessageCircle,
  system: Settings,
  other: HelpCircle,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  coding: "开发",
  browsing: "浏览",
  study: "学习",
  entertainment: "娱乐",
  communication: "通讯",
  system: "系统",
  other: "其他",
};

export const CATEGORY_CLASS: Record<Category, { text: string; bg: string; bar: string; label: string }> = {
  coding: { text: "text-statusSuccess", bg: "bg-statusSuccess/10", bar: "bg-statusSuccess", label: CATEGORY_LABELS.coding },
  browsing: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo", label: CATEGORY_LABELS.browsing },
  study: { text: "text-primary", bg: "bg-primary/10", bar: "bg-primary", label: CATEGORY_LABELS.study },
  entertainment: { text: "text-statusWarning", bg: "bg-statusWarning/10", bar: "bg-statusWarning", label: CATEGORY_LABELS.entertainment },
  communication: { text: "text-statusInfo", bg: "bg-statusInfo/10", bar: "bg-statusInfo", label: CATEGORY_LABELS.communication },
  system: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground", label: CATEGORY_LABELS.system },
  other: { text: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground", label: CATEGORY_LABELS.other },
};
