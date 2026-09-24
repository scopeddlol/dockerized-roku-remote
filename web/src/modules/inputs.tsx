import { Cable, HdmiPort, Plug, RadioTower } from "lucide-react";
import { motion } from "motion/react";
import { ModuleCard } from "@/components/module-card";
import { useApps, useCommand, useStatus } from "@/lib/api";
import { brandFor } from "@/lib/brands";
import { useIsDark } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function portLabel(id: string) {
  const hdmi = id.match(/hdmi(\d+)/i);
  if (hdmi) return `HDMI ${hdmi[1]}`;
  if (/dtv|tuner/i.test(id)) return "Antenna";
  if (/cvbs|av/i.test(id)) return "AV";
  return id.replace("tvinput.", "");
}

function PortIcon({ id, name }: { id: string; name: string }) {
  const dark = useIsDark();
  const brand = brandFor(name);
  if (brand) return <img src={dark ? brand.dark : brand.light} alt="" className="size-6 object-contain" />;
  if (/dtv|tuner/i.test(id)) return <RadioTower />;
  if (/hdmi/i.test(id)) return <HdmiPort />;
  if (/cvbs|av/i.test(id)) return <Cable />;
  return <Plug />;
}

export function Inputs() {
  const { data: status } = useStatus();
  const { data: apps } = useApps(!!status?.configured);
  const cmd = useCommand();
  const inputs = (apps ?? []).filter((a) => a.type === "tvin");
  const activeId = status?.app?.id;

  return (
    <ModuleCard title="Inputs" icon={HdmiPort}>
      {inputs.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          {apps ? "This Roku has no TV inputs." : "Loading…"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
          {inputs.map((input) => {
            const active = input.id === activeId;
            return (
              <motion.button
                key={input.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => cmd.launch(input.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-key p-3 text-left ring-1 ring-transparent transition-colors hover:bg-key-hover",
                  active && "bg-primary/10 ring-primary/60",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/60 text-muted-foreground [&_svg]:size-5",
                    active && "text-primary",
                  )}
                >
                  <PortIcon id={input.id} name={input.name} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{input.name}</div>
                  <div className="text-xs text-muted-foreground">{portLabel(input.id)}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </ModuleCard>
  );
}
