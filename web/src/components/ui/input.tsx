import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-input bg-background/40 px-3.5 text-[15px] transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        className,
      )}
      {...props}
    />
  );
}
