import { LayoutDashboard, Settings2 } from "lucide-react";
import { useStatus } from "@/lib/api";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { shortName } from "@/modules/apps";
import { Button } from "./ui/button";
import { Tooltip } from "./ui/tooltip";

export function Header() {
  const { data, isError } = useStatus();
  const open = useUI((s) => s.open);

  const on = data?.reachable && data.device?.power === "PowerOn";
  const tone = isError || (data?.configured && !data.reachable) ? "bg-destructive" : on ? "bg-success" : data?.reachable ? "bg-warning" : "bg-muted-foreground/50";
  const title = data?.device?.name || (data?.configured === false ? "No TV yet" : "Roku Remote");
  const subtitle = isError
    ? "Server offline"
    : !data
      ? "Connecting…"
      : !data.configured
        ? "Open settings to connect"
        : !data.reachable
          ? `Unreachable · ${data.tv_ip}`
          : !on
            ? "Standby"
            : data.app?.id
              ? shortName(data.app.name || "")
              : "Home screen";

  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-xl [@supports(backdrop-filter:blur(0))]:bg-background/55">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <img src="/icons/app.svg" alt="" className="size-9 rounded-[10px] shadow-[0_6px_20px_-6px_var(--ring)]" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-semibold tracking-tight">{title}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-1.5 shrink-0 rounded-full", tone, on && "shadow-[0_0_8px] shadow-success")} />
            <span className="truncate">{subtitle}</span>
          </div>
        </div>
        <Tooltip label="Customize layout">
          <Button variant="ghost" size="icon" onClick={() => open("customize")} aria-label="Customize layout">
            <LayoutDashboard className="size-[18px]" />
          </Button>
        </Tooltip>
        <Tooltip label="Settings">
          <Button variant="ghost" size="icon" onClick={() => open("settings")} aria-label="Settings">
            <Settings2 className="size-[18px]" />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
