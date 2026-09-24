import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { haptic } from "./utils";

export type Status = {
  configured: boolean;
  reachable: boolean;
  tv_ip?: string;
  device?: { name: string | null; model: string | null; power: string | null; is_tv: boolean };
  app?: { id: string | null; name: string | null; screensaver: boolean };
  player?: { state: string | null; position_ms: number | null; duration_ms: number | null };
};

export type App = { id: string; name: string; type: string };

export type StepType = "keypress" | "launch" | "delay" | "text";
export type Step = { type: StepType; value: string | number };
export type Macro = { name: string; icon: string; steps: Step[] };

export type Discovered = { ip: string; name: string | null; model: string | null };

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new ApiError(data.error || resp.statusText, resp.status, data.code);
  return data as T;
}

const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  status: () => request<Status>("/api/status"),
  apps: () => request<App[]>("/api/apps"),
  macros: () => request<Macro[]>("/api/macros"),
  config: () => request<{ tv_ip: string | null }>("/api/config"),
  discover: (subnet?: string) =>
    request<{ devices: Discovered[]; interfaces: string[] }>(
      "/api/discover" + (subnet ? `?subnet=${encodeURIComponent(subnet)}` : ""),
    ),
  keypress: (key: string) => post(`/api/keypress/${encodeURIComponent(key)}`),
  launch: (id: string) => post(`/api/launch/${encodeURIComponent(id)}`),
  text: (text: string) => post("/api/text", { text }),
  runMacro: (name: string) => post(`/api/macro/${encodeURIComponent(name)}`),
  saveMacros: (macros: Macro[]) => post<Macro[]>("/api/macros", macros),
  saveConfig: (tv_ip: string) => post<{ tv_ip: string }>("/api/config", { tv_ip }),
};

export const iconUrl = (id: string) => `/api/icon/${encodeURIComponent(id)}`;

// -- hooks -----------------------------------------------------------------

export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.status,
    refetchInterval: 2000,
    retry: false,
  });
}

export function useApps(enabled = true) {
  return useQuery({
    queryKey: ["apps"],
    queryFn: api.apps,
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useMacros() {
  return useQuery({ queryKey: ["macros"], queryFn: api.macros });
}

function reportError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // Same id -> a burst of failed keypresses shows one toast, not twenty.
  toast.error("Couldn't reach the TV", { id: "tv-error", description: message });
}

/** Fire-and-forget remote command; nudges a status refresh shortly after. */
export function useCommand() {
  const qc = useQueryClient();
  return useMemo(() => {
    const refresh = () =>
      setTimeout(() => qc.invalidateQueries({ queryKey: ["status"] }), 450);
    return {
    key: (key: string) => {
      haptic();
      api.keypress(key).then(refresh, reportError);
    },
    launch: (id: string) => {
      haptic(12);
      api.launch(id).then(refresh, reportError);
    },
    };
  }, [qc]);
}

export function useSaveMacros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveMacros,
    onSuccess: (saved) => qc.setQueryData(["macros"], saved),
  });
}
