"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary/10">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-[14px] font-semibold mb-1.5 text-foreground">
        {title}
      </h3>
      <p className="text-[12px] leading-relaxed mb-5 max-w-[280px] mx-auto text-muted-foreground">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex px-4 py-2 rounded-xl text-[12px] font-medium transition-colors bg-primary text-primary-foreground"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
