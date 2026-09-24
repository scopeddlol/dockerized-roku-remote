import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function ModuleCard({
  title,
  icon: Icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[26px] border bg-card shadow-card backdrop-blur-xl backdrop-saturate-150",
        className,
      )}
    >
      {title && (
        <header className="flex h-12 items-center justify-between gap-2 px-5 pt-1">
          <h2 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            {Icon && <Icon className="size-4" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", title && "pt-1", bodyClassName)}>{children}</div>
    </section>
  );
}
