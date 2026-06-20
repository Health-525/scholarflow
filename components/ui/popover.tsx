"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";

import { cn } from "@/lib/utils";

const Popover = BasePopover.Root;

const PopoverTrigger = BasePopover.Trigger;

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
    sideOffset?: number;
  }
>(({ className, align = "start", side = "bottom", sideOffset = 4, ...props }, ref) => (
  <BasePopover.Portal>
    <BasePopover.Positioner
      align={align}
      side={side}
      sideOffset={sideOffset}
      style={{ zIndex: 9999 }}
    >
      <BasePopover.Popup
        ref={ref}
        className={cn(
          "rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          className
        )}
        {...props}
      />
    </BasePopover.Positioner>
  </BasePopover.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
