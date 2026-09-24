import { LayoutGrid, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { ModuleCard } from "@/components/module-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApps, useCommand, useStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const COLLAPSED = 12;

/** "Plex - Free Movies & TV" -> "Plex": Roku names carry store taglines. */
export const shortName = (name: string) => name.split(/ [-–:|] /)[0];

export function Apps() {
  const { data: status } = useStatus();
  const { data: apps, isPending, isError } = useApps(!!status?.configured);
  const cmd = useCommand();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const channels = useMemo(() => (apps ?? []).filter((a) => a.type !== "tvin"), [apps]);
  const filtered = query
    ? channels.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    : channels;
  const visible = expanded || query ? filtered : filtered.slice(0, COLLAPSED);
  const activeId = status?.app?.id;

  return (
    <ModuleCard
      title="Apps"
      icon={LayoutGrid}
      action={
        <div className="flex items-center gap-1">
          <AnimatePresence initial={false}>
            {searching && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && (setQuery(""), setSearching(false))}
                  placeholder="Filter apps"
                  className="h-8 rounded-lg text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={searching ? "Close search" : "Search apps"}
            onClick={() => {
              setSearching(!searching);
              setQuery("");
            }}
          >
            {searching ? <X /> : <Search />}
          </Button>
        </div>
      }
    >
      {isPending || isError ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-key" />
          ))}
        </div>
      ) : (
        <>
          <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-4">
            {visible.map((app) => (
              <motion.button
                layout
                key={app.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => cmd.launch(app.id)}
                className="group flex min-w-0 flex-col items-center gap-2 text-center"
              >
                <div className="relative w-full">
                  <AppIcon
                    id={app.id}
                    name={app.name}
                    className={cn(
                      "aspect-[4/3] w-full rounded-2xl bg-key ring-1 ring-border transition-all group-hover:-translate-y-0.5 group-hover:bg-key-hover group-hover:shadow-lg",
                      app.id === activeId && "ring-2 ring-primary",
                    )}
                  />
                  {app.id === activeId && (
                    <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-card-solid bg-primary" />
                  )}
                </div>
                <span className="w-full truncate text-xs text-muted-foreground group-hover:text-foreground">
                  {shortName(app.name)}
                </span>
              </motion.button>
            ))}
          </motion.div>
          {!query && filtered.length > COLLAPSED && (
            <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show all ${filtered.length} apps`}
            </Button>
          )}
          {query && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No apps match "{query}"</p>
          )}
        </>
      )}
    </ModuleCard>
  );
}
