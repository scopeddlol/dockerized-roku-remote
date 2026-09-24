import { motion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** iOS-style segmented control with a sliding highlight. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  id: string;
  className?: string;
}) {
  return (
    <div className={cn("relative grid auto-cols-fr grid-flow-col rounded-xl bg-key p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 -z-10 rounded-lg bg-card-solid shadow-sm ring-1 ring-border"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
