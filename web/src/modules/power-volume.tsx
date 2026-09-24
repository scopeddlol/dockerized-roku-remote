import { Minus, Plus, Power, VolumeX } from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { RemoteKey } from "@/components/remote-key";

export function PowerVolume() {
  return (
    <ModuleCard bodyClassName="p-3">
      <div className="flex gap-2.5">
        <RemoteKey ecpKey="Power" label="Power" tone="danger" className="w-14 shrink-0">
          <Power />
        </RemoteKey>
        <div className="grid flex-1 grid-cols-3 overflow-hidden rounded-2xl bg-key">
          <RemoteKey ecpKey="VolumeDown" label="Volume down" tone="ghost" className="rounded-none">
            <Minus />
          </RemoteKey>
          <RemoteKey ecpKey="VolumeMute" label="Mute" tone="ghost" className="rounded-none border-x border-border">
            <VolumeX />
          </RemoteKey>
          <RemoteKey ecpKey="VolumeUp" label="Volume up" tone="ghost" className="rounded-none">
            <Plus />
          </RemoteKey>
        </div>
      </div>
    </ModuleCard>
  );
}
