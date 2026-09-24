import { Tooltip as T } from "radix-ui";
import * as React from "react";

export const TooltipProvider = T.Provider;

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          sideOffset={6}
          className="z-50 rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg"
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
