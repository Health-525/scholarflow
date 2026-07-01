import { Mascot } from "@/components/ximi/Mascot";
import { cn } from "@/lib/utils";

interface CatAvatarProps {
  className?: string;
  /** "desktop" | "mobile"，控制边框颜色和背景 token */
  variant?: "desktop" | "mobile";
}

export function CatAvatar({ className, variant = "desktop" }: CatAvatarProps) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full border-2",
        variant === "desktop"
          ? "border-border bg-secondary"
          : "border-white bg-surface-container shadow-sm",
        className,
      )}
    >
      <Mascot size="xs" eager className="!drop-shadow-none" />
    </span>
  );
}
