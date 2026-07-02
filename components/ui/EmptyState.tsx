import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card role="status" aria-live="polite" className="py-10 text-center items-center gap-3 border-2 border-dashed border-border rounded-2xl">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center motion-safe:animate-breathe">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Card>
  );
}

export default EmptyState;
