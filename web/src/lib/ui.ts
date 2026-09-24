import { create } from "zustand";

type Panel = "settings" | "customize" | "automations" | null;

/** Which slide-over panel is open. Not persisted. */
export const useUI = create<{ panel: Panel; open: (p: Panel) => void }>((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
}));
