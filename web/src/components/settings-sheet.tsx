import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Monitor, Moon, Radar, Sun, Tv } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { usePrefs, type Theme } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Segmented } from "./ui/segmented";
import { Sheet } from "./ui/sheet";

export function SettingsSheet() {
  const { panel, open } = useUI();
  const isOpen = panel === "settings";
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(o) => open(o ? "settings" : null)}
      title="Settings"
      description="Connect to your Roku and tune the look."
    >
      <div className="space-y-8">
        {isOpen && <TvSection />}
        <Section title="Appearance">
          <ThemePicker />
        </Section>
        <Section title="About">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Talks to your TV over Roku's{" "}
              <a className="text-foreground underline-offset-4 hover:underline" href="https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md" target="_blank" rel="noreferrer">
                External Control Protocol
              </a>{" "}
              on your local network. Nothing leaves your LAN.
            </p>
            <p>
              App logos from{" "}
              <a className="text-foreground underline-offset-4 hover:underline" href="https://selfh.st/icons" target="_blank" rel="noreferrer">selfh.st/icons</a>{" "}
              (CC BY 4.0) and{" "}
              <a className="text-foreground underline-offset-4 hover:underline" href="https://simpleicons.org" target="_blank" rel="noreferrer">Simple Icons</a>{" "}
              (CC0). UI icons by{" "}
              <a className="text-foreground underline-offset-4 hover:underline" href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a>.
            </p>
          </div>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ThemePicker() {
  const { theme, setTheme } = usePrefs();
  return (
    <Segmented<Theme>
      id="theme"
      value={theme}
      onChange={setTheme}
      options={[
        { value: "system", label: "Auto", icon: <Monitor className="size-3.5" /> },
        { value: "light", label: "Light", icon: <Sun className="size-3.5" /> },
        { value: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
      ]}
    />
  );
}

function TvSection() {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["config"], queryFn: api.config });
  const [ip, setIp] = useState("");
  const [subnet, setSubnet] = useState("");
  const current = config.data?.tv_ip ?? null;

  useEffect(() => {
    if (current) setIp(current);
  }, [current]);

  const save = useMutation({
    mutationFn: api.saveConfig,
    onSuccess: ({ tv_ip }) => {
      qc.setQueryData(["config"], { tv_ip });
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["apps"] });
      toast.success("TV saved", { description: tv_ip });
    },
    onError: (e) => toast.error("Couldn't save", { description: e.message }),
  });

  const scan = useMutation({
    mutationFn: () => api.discover(subnet.trim() || undefined),
    onSuccess: (r) => {
      if (r.devices.length === 1 && !current) save.mutate(r.devices[0].ip);
    },
  });

  return (
    <Section title="Your TV">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(ip.trim());
        }}
      >
        <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.50" inputMode="decimal" />
        <Button type="submit" disabled={!ip.trim() || ip.trim() === current || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : "Save"}
        </Button>
      </form>

      <div className="mt-4 rounded-2xl border bg-background/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Find Rokus on your network</div>
            <div className="text-xs text-muted-foreground">SSDP broadcast, then a subnet scan</div>
          </div>
          <Button variant="secondary" onClick={() => scan.mutate()} disabled={scan.isPending}>
            {scan.isPending ? <Loader2 className="animate-spin" /> : <Radar />}
            {scan.isPending ? "Scanning" : "Scan"}
          </Button>
        </div>

        <details className="group mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Scan a specific subnet</summary>
          <Input
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            placeholder="192.168.1"
            className="mt-2 h-9 text-sm"
          />
          <p className="mt-1.5">
            Use this when running Docker without host networking. Enter the first three parts of your LAN addresses.
          </p>
        </details>

        <AnimatePresence initial={false}>
          {scan.data && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
              <ul className="mt-4 space-y-2">
                {scan.data.devices.map((d) => {
                  const active = d.ip === current;
                  return (
                    <li key={d.ip}>
                      <button
                        type="button"
                        onClick={() => save.mutate(d.ip)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl bg-key p-3 text-left ring-1 ring-transparent transition-colors hover:bg-key-hover",
                          active && "ring-primary/60",
                        )}
                      >
                        <div className="flex size-9 items-center justify-center rounded-lg bg-background/60 text-primary">
                          <Tv className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{d.name || "Roku"}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {d.ip}{d.model ? ` · ${d.model}` : ""}
                          </div>
                        </div>
                        {active ? <Check className="size-4 text-primary" /> : <span className="text-xs font-medium text-primary">Use</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {scan.data.devices.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No Rokus found from {scan.data.interfaces.join(", ") || "this host"}. Check that{" "}
                  <span className="text-foreground">Settings → System → Advanced → Control by mobile apps</span> is on,
                  or try a specific subnet.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {scan.isError && <p className="mt-3 text-sm text-destructive">{scan.error.message}</p>}
      </div>
    </Section>
  );
}
