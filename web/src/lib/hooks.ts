import { useEffect, useState, useSyncExternalStore } from "react";
import { usePrefs } from "./store";

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/** Resolved theme ("system" follows the OS), kept in sync with <html class="dark">. */
export function useResolvedTheme() {
  const theme = usePrefs((s) => s.theme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const dark = theme === "dark" || (theme === "system" && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#09090b" : "#f6f6f9");
  }, [dark]);
  return dark ? "dark" : "light";
}

export function useIsDark() {
  const theme = usePrefs((s) => s.theme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  return theme === "dark" || (theme === "system" && systemDark);
}

/** Current time, re-rendering every `ms` while `active`. */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}
