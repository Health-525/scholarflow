"use client";

import { Library } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";

export interface LibraryHeaderProps {
  actions?: ReactNode;
}

export function LibraryHeader({ actions }: LibraryHeaderProps) {
  return (
    <PageHeader
      icon={<Library className="w-5 h-5 text-primary" />}
      title="图书馆座位"
      description="实时座位查询与预约"
      actions={actions}
    />
  );
}
