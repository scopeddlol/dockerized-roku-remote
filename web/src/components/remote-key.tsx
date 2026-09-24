import { motion } from "motion/react";
import * as React from "react";
import { useCommand } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof motion.button>, "children"> & {
  ecpKey?: string;
  label: string;
  children: React.ReactNode;
  tone?: "default" | "primary" | "danger" | "ghost";
};

/** A physical-feeling remote button. Sends `ecpKey` to the TV on tap. */
export function RemoteKey({ ecpKey, label, tone = "default", className, onClick, children, ...rest }: Props) {
  const cmd = useCommand();
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={(e) => {
        if (ecpKey) cmd.key(ecpKey);
        onClick?.(e);
      }}
      className={cn(
        "flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-medium transition-colors [&_svg]:size-5",
        tone === "default" && "bg-key text-foreground hover:bg-key-hover",
        tone === "primary" && "bg-primary text-primary-foreground shadow-[0_10px_30px_-10px_var(--ring)]",
        tone === "danger" && "bg-destructive/12 text-destructive hover:bg-destructive/20",
        tone === "ghost" && "text-muted-foreground hover:bg-key hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
