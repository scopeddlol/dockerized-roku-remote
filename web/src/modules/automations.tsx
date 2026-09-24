import { Check, Loader2, Pencil, Workflow } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { MacroIcon } from "@/components/macro-icon";
import { ModuleCard } from "@/components/module-card";
import { Button } from "@/components/ui/button";
import { api, useMacros, type Macro } from "@/lib/api";
import { useUI } from "@/lib/ui";
import { cn, haptic } from "@/lib/utils";

export function describeSteps(macro: Macro) {
  const ms = macro.steps.reduce((t, s) => t + (s.type === "delay" ? Number(s.value) : 150), 0);
  const n = macro.steps.length;
  return `${n} step${n === 1 ? "" : "s"}${ms >= 1000 ? ` · ${(ms / 1000).toFixed(1)}s` : ""}`;
}

export function Automations() {
  const { data: macros, isPending } = useMacros();
  const open = useUI((s) => s.open);
  const [running, setRunning] = useState<Record<string, "run" | "done">>({});

  async function run(macro: Macro) {
    haptic(15);
    setRunning((r) => ({ ...r, [macro.name]: "run" }));
    try {
      await api.runMacro(macro.name);
      setRunning((r) => ({ ...r, [macro.name]: "done" }));
      setTimeout(() => setRunning(({ [macro.name]: _, ...rest }) => rest), 1400);
    } catch (e) {
      setRunning(({ [macro.name]: _, ...rest }) => rest);
      toast.error(`"${macro.name}" failed`, { description: (e as Error).message });
    }
  }

  return (
    <ModuleCard
      title="Automations"
      icon={Workflow}
      action={
        <Button size="sm" variant="ghost" onClick={() => open("automations")}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      }
    >
      {isPending ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-key" />)}
        </div>
      ) : !macros?.length ? (
        <button
          type="button"
          onClick={() => open("automations")}
          className="w-full rounded-2xl border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-key"
        >
          Chain keypresses, app launches and delays into one-tap scenes →
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
          {macros.map((macro) => {
            const state = running[macro.name];
            return (
              <motion.button
                key={macro.name}
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={state === "run"}
                onClick={() => run(macro)}
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden rounded-2xl bg-key p-3 text-left transition-colors hover:bg-key-hover",
                  state && "ring-1 ring-primary/60",
                )}
              >
                {state === "run" && (
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    initial={{ width: "0%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 4, ease: "easeOut" }}
                  />
                )}
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-fuchsia-500/15 text-primary">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={state ?? "idle"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="flex"
                    >
                      {state === "run" ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : state === "done" ? (
                        <Check className="size-5 text-success" />
                      ) : (
                        <MacroIcon icon={macro.icon} />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="relative min-w-0">
                  <div className="truncate text-sm font-medium">{macro.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{describeSteps(macro)}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </ModuleCard>
  );
}
