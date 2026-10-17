"use client";

import { Tooltip as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;
export function TooltipContent(props: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={4}
        className="z-50 rounded-md bg-foreground px-3 py-2 text-caption text-background"
        {...props}
      />
    </Primitive.Portal>
  );
}
