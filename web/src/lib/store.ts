import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-device preferences, saved in localStorage. A phone and a desktop can
 * each have their own layout; TV settings and automations live on the server.
 */

export type Zone = "remote" | "dashboard";
export type Theme = "system" | "light" | "dark";

export type Layout = Record<Zone, string[]>;

type Prefs = {
  theme: Theme;
  layout: Layout;
  hidden: string[];
  setTheme: (theme: Theme) => void;
  setLayout: (layout: Layout) => void;
  toggleModule: (id: string) => void;
  moveModule: (id: string, to: Zone) => void;
  resetLayout: () => void;
};

// Filled in by modules/registry.tsx, which knows every module's default zone.
export const defaults: { layout: Layout; hidden: string[] } = {
  layout: { remote: [], dashboard: [] },
  hidden: [],
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      theme: "system",
      layout: { remote: [], dashboard: [] },
      hidden: [],
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout }),
      toggleModule: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id],
        })),
      moveModule: (id, to) =>
        set((s) => {
          const from: Zone = to === "remote" ? "dashboard" : "remote";
          return {
            layout: {
              ...s.layout,
              [from]: s.layout[from].filter((m) => m !== id),
              [to]: [...s.layout[to].filter((m) => m !== id), id],
            } as Layout,
          };
        }),
      resetLayout: () =>
        set({ layout: structuredClone(defaults.layout), hidden: [...defaults.hidden] }),
    }),
    { name: "roku-remote:prefs", version: 1 },
  ),
);

/**
 * Reconcile a saved layout with the modules that exist now: drop removed
 * ones, and append modules added since the layout was saved (hidden if
 * they're hidden by default).
 */
export function reconcileLayout(known: Set<string>) {
  const { layout, hidden } = usePrefs.getState();
  const seen = new Set([...layout.remote, ...layout.dashboard]);
  const firstRun = seen.size === 0;
  const next: Layout = {
    remote: layout.remote.filter((id) => known.has(id)),
    dashboard: layout.dashboard.filter((id) => known.has(id)),
  };
  const nextHidden = hidden.filter((id) => known.has(id));
  for (const zone of ["remote", "dashboard"] as Zone[]) {
    for (const id of defaults.layout[zone]) {
      if (seen.has(id)) continue;
      next[zone].push(id);
      if (defaults.hidden.includes(id) && !nextHidden.includes(id)) nextHidden.push(id);
    }
  }
  if (firstRun) {
    usePrefs.setState({ layout: structuredClone(defaults.layout), hidden: [...defaults.hidden] });
  } else {
    usePrefs.setState({ layout: next, hidden: nextHidden });
  }
}
