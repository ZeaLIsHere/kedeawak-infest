"use client";

import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <Primitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-card",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tutup dialog"
        >
          <X aria-hidden="true" className="size-5" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("pr-10 text-section-title font-semibold", className)}
      {...props}
    />
  );
}
export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("mt-2 text-body text-muted-foreground", className)}
      {...props}
    />
  );
}
