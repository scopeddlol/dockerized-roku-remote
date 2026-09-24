import { FastForward, Pause, Play, Rewind, RotateCcw } from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { RemoteKey } from "@/components/remote-key";
import { useStatus } from "@/lib/api";

export function Playback() {
  const { data } = useStatus();
  const playing = data?.player?.state === "play";
  return (
    <ModuleCard bodyClassName="p-3">
      <div className="grid grid-cols-[1fr_1fr_1.3fr_1fr] gap-2.5">
        <RemoteKey ecpKey="InstantReplay" label="Instant replay"><RotateCcw /></RemoteKey>
        <RemoteKey ecpKey="Rev" label="Rewind"><Rewind /></RemoteKey>
        <RemoteKey ecpKey="Play" label={playing ? "Pause" : "Play"} tone="primary">
          {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </RemoteKey>
        <RemoteKey ecpKey="Fwd" label="Fast forward"><FastForward /></RemoteKey>
      </div>
    </ModuleCard>
  );
}
