import { AlertTriangle, Loader2, Power, Radar, RefreshCw, Tv } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AppIcon } from "@/components/app-icon";
import { Button } from "@/components/ui/button";
import { iconUrl, useCommand, useStatus, type Status } from "@/lib/api";
import { useNow } from "@/lib/hooks";
import { useUI } from "@/lib/ui";
import { cn, formatTime } from "@/lib/utils";

export function NowPlaying() {
  const { data, isPending, isError, dataUpdatedAt, refetch } = useStatus();
  const open = useUI((s) => s.open);

  let body: React.ReactNode;
  let key: string;
  if (isPending) {
    key = "loading";
    body = (
      <Message icon={<Loader2 className="animate-spin" />} title="Connecting…" subtitle="Looking for your TV" />
    );
  } else if (isError) {
    key = "server";
    body = (
      <Message
        tone="warn"
        icon={<AlertTriangle />}
        title="Server unreachable"
        subtitle="The remote's backend isn't responding."
        action={<Button variant="secondary" onClick={() => refetch()}><RefreshCw />Retry</Button>}
      />
    );
  } else if (!data.configured) {
    key = "setup";
    body = (
      <Message
        icon={<Tv />}
        title="Let's find your TV"
        subtitle="Scan your network for Rokus, or enter its IP address."
        action={<Button onClick={() => open("settings")}><Radar />Set up</Button>}
      />
    );
  } else if (!data.reachable) {
    key = "offline";
    body = (
      <Message
        tone="warn"
        icon={<AlertTriangle />}
        title="TV unreachable"
        subtitle={`Nothing answered at ${data.tv_ip}. Is it plugged in and on the network?`}
        action={<Button variant="secondary" onClick={() => open("settings")}>Settings</Button>}
      />
    );
  } else if (data.device?.power !== "PowerOn") {
    key = "standby";
    body = <Standby name={data.device?.name} />;
  } else {
    key = `on-${data.app?.id}`;
    body = <Playing status={data} updatedAt={dataUpdatedAt} />;
  }

  return (
    <section className="relative overflow-hidden rounded-[26px] border bg-card shadow-card backdrop-blur-xl">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Message({
  icon,
  title,
  subtitle,
  action,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-5">
      <div
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-key [&_svg]:size-6",
          tone === "warn" ? "text-warning" : "text-primary",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold tracking-tight">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      {action && <div className="w-full sm:w-auto [&>button]:w-full">{action}</div>}
    </div>
  );
}

function Standby({ name }: { name?: string | null }) {
  const cmd = useCommand();
  return (
    <div className="flex flex-wrap items-center gap-4 p-5">
      <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-key text-muted-foreground">
        <Tv className="size-6" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold tracking-tight">{name || "Roku TV"} is off</div>
        <div className="text-sm text-muted-foreground">In standby, ready to wake</div>
      </div>
      <Button size="lg" className="w-full sm:w-auto" onClick={() => cmd.key("PowerOn")}>
        <Power />
        Turn on
      </Button>
    </div>
  );
}

const STATE_LABEL: Record<string, string> = {
  play: "Playing",
  pause: "Paused",
  buffer: "Buffering",
  startup: "Starting",
  stop: "Stopped",
};

function Playing({ status, updatedAt }: { status: Status; updatedAt: number }) {
  const app = status.app!;
  const player = status.player!;
  const onHome = !app.id;
  const name = onHome ? "Home" : app.name || "Unknown app";
  const playing = player.state === "play";
  const live = STATE_LABEL[player.state ?? ""];

  // Position arrives every ~2s; interpolate between polls so the bar glides.
  const now = useNow(playing);
  const position =
    player.position_ms == null
      ? null
      : player.position_ms + (playing ? Math.max(0, now - updatedAt) : 0);
  const duration = player.duration_ms;
  const pct = position != null && duration ? Math.min(100, (position / duration) * 100) : null;

  return (
    <div className="relative">
      {/* Blurred artwork wash behind the card, like a music player. */}
      {!onHome && (
        <img
          src={iconUrl(app.id!)}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-30 blur-3xl saturate-150 dark:opacity-25"
        />
      )}
      <div className="relative flex items-center gap-4 p-4 sm:p-5">
        {onHome ? (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-key">
            <img src="/icons/brands/si-roku.svg" className="w-10 dark:hidden" alt="" />
            <img src="/icons/brands/si-roku-light.svg" className="hidden w-10 dark:block" alt="" />
          </div>
        ) : (
          <AppIcon
            id={app.id!}
            name={name}
            className="size-16 shrink-0 rounded-2xl bg-card-solid/80 shadow-lg ring-1 ring-border"
            logoClassName="size-9"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="truncate">{status.device?.name || "Roku TV"}</span>
            {app.screensaver && <span className="rounded-full bg-key px-2 py-0.5">Screensaver</span>}
          </div>
          <div className="mt-0.5 truncate text-xl font-semibold tracking-tight">{name}</div>
          {live && !onHome ? (
            <div className="mt-2 flex items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  playing ? "bg-primary/15 text-primary" : "bg-key text-muted-foreground",
                )}
              >
                {live}
              </span>
              {pct != null && (
                <div className="flex flex-1 items-center gap-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span>{formatTime(position)}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500 transition-[width] duration-300 ease-linear"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              {onHome ? "Browsing the home screen" : "Ready"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
