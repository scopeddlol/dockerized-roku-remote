import { Gamepad2, LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AutomationsSheet } from "@/components/automations-sheet";
import { CustomizeSheet } from "@/components/customize-sheet";
import { Header } from "@/components/header";
import { SettingsSheet } from "@/components/settings-sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCommand } from "@/lib/api";
import { useIsDesktop, useResolvedTheme } from "@/lib/hooks";
import { usePrefs, type Zone } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { MODULE_BY_ID } from "@/modules/registry";
import { SHORTCUTS } from "@/modules/shortcuts";

export default function App() {
  const theme = useResolvedTheme();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Zone>("remote");
  useKeyboardShortcuts();

  return (
    <TooltipProvider delayDuration={400}>
      <Header />
      <main className="mx-auto max-w-7xl px-3 pb-32 pt-2 sm:px-6 lg:pb-12">
        {isDesktop ? (
          <div className="grid grid-cols-[minmax(340px,380px)_1fr] items-start gap-5">
            <div className="sticky top-20">
              <ZoneColumn zone="remote" />
            </div>
            <ZoneColumn zone="dashboard" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "remote" ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "remote" ? -16 : 16 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="mx-auto max-w-md sm:max-w-2xl"
            >
              <ZoneColumn zone={tab} />
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      {!isDesktop && <TabBar tab={tab} setTab={setTab} />}

      <SettingsSheet />
      <CustomizeSheet />
      <AutomationsSheet />
      <Toaster theme={theme} position={isDesktop ? "bottom-right" : "top-center"} richColors closeButton />
    </TooltipProvider>
  );
}

function ZoneColumn({ zone }: { zone: Zone }) {
  const ids = usePrefs((s) => s.layout[zone]);
  const hidden = usePrefs((s) => s.hidden);
  const open = useUI((s) => s.open);
  const shown = ids.filter((id) => !hidden.includes(id) && MODULE_BY_ID[id]);

  if (shown.length === 0) {
    return (
      <button
        type="button"
        onClick={() => open("customize")}
        className="w-full rounded-[26px] border border-dashed p-10 text-center text-sm text-muted-foreground transition-colors hover:bg-card"
      >
        Nothing here yet. Tap to add modules.
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {shown.map((id) => {
          const Component = MODULE_BY_ID[id].component;
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <Component />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: Zone; setTab: (z: Zone) => void }) {
  const tabs = [
    { zone: "remote" as Zone, label: "Remote", icon: Gamepad2 },
    { zone: "dashboard" as Zone, label: "Launch", icon: LayoutGrid },
  ];
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex justify-center px-6">
      <div className="flex gap-1 rounded-full border bg-card-solid/80 p-1.5 shadow-2xl backdrop-blur-xl">
        {tabs.map(({ zone, label, icon: Icon }) => (
          <button
            key={zone}
            type="button"
            onClick={() => setTab(zone)}
            className={cn(
              "relative flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors",
              tab === zone ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {tab === zone && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_8px_24px_-8px_var(--ring)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              />
            )}
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

const KEYMAP = Object.fromEntries(SHORTCUTS.map(([code, , key]) => [code, key]));

function useKeyboardShortcuts() {
  const cmd = useCommand();
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      // Read the panel directly and listen in the capture phase: otherwise the
      // Escape that closes a panel would also send "Home" to the TV.
      if (useUI.getState().panel || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (el?.closest("[role=dialog]")) return;
      const key = KEYMAP[ev.key];
      if (!key) return;
      ev.preventDefault();
      cmd.key(key);
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [cmd]);
}
