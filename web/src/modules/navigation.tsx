import { ArrowLeft, Asterisk, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, House } from "lucide-react";
import { motion } from "motion/react";
import { ModuleCard } from "@/components/module-card";
import { RemoteKey } from "@/components/remote-key";
import { useCommand } from "@/lib/api";
import { cn } from "@/lib/utils";

// Each arrow owns a quarter of the ring, cut on the diagonals like a real remote.
const WEDGES = [
  { key: "Up", Icon: ChevronUp, clip: "polygon(0 0, 100% 0, 50% 50%)", pos: "top-[9%] left-1/2 -translate-x-1/2" },
  { key: "Right", Icon: ChevronRight, clip: "polygon(100% 0, 100% 100%, 50% 50%)", pos: "right-[9%] top-1/2 -translate-y-1/2" },
  { key: "Down", Icon: ChevronDown, clip: "polygon(0 100%, 100% 100%, 50% 50%)", pos: "bottom-[9%] left-1/2 -translate-x-1/2" },
  { key: "Left", Icon: ChevronLeft, clip: "polygon(0 0, 0 100%, 50% 50%)", pos: "left-[9%] top-1/2 -translate-y-1/2" },
] as const;

export function Navigation() {
  const cmd = useCommand();
  return (
    <ModuleCard bodyClassName="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <RemoteKey ecpKey="Back" label="Back"><ArrowLeft /></RemoteKey>
        <RemoteKey ecpKey="Home" label="Home"><House /></RemoteKey>
        <RemoteKey ecpKey="Info" label="Options (*)"><Asterisk /></RemoteKey>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[272px] rounded-full bg-key p-0 shadow-[inset_0_2px_12px_oklch(0_0_0/0.12)] ring-1 ring-border">
        {WEDGES.map(({ key, Icon, clip, pos }) => (
          <button
            key={key}
            type="button"
            aria-label={key}
            onClick={() => cmd.key(key)}
            style={{ clipPath: clip }}
            className="group absolute inset-0 rounded-full transition-colors hover:bg-foreground/[0.04] active:bg-primary/15"
          >
            <Icon
              className={cn(
                "absolute size-7 text-muted-foreground transition-all group-hover:text-foreground group-active:scale-90 group-active:text-primary",
                pos,
              )}
            />
          </button>
        ))}
        {/* hairlines on the diagonals */}
        <svg className="pointer-events-none absolute inset-0 size-full text-border" viewBox="0 0 100 100">
          <path d="M18 18 L38 38 M82 18 L62 38 M18 82 L38 62 M82 82 L62 62" stroke="currentColor" strokeWidth=".6" />
        </svg>
        <motion.button
          type="button"
          aria-label="OK"
          onClick={() => cmd.key("Select")}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 600, damping: 28 }}
          className="absolute left-1/2 top-1/2 flex size-[38%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-primary to-[oklch(0.52_0.24_293)] text-lg font-semibold tracking-wide text-primary-foreground shadow-[0_12px_32px_-8px_var(--ring),inset_0_1px_0_oklch(1_0_0/0.25)]"
        >
          OK
        </motion.button>
      </div>
    </ModuleCard>
  );
}
