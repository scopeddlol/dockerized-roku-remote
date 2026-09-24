import { ChevronDown, ChevronUp, RadioTower } from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { RemoteKey } from "@/components/remote-key";

export function Tuner() {
  return (
    <ModuleCard title="Live TV" icon={RadioTower}>
      <div className="grid grid-cols-3 gap-2.5">
        <RemoteKey ecpKey="ChannelDown" label="Channel down"><ChevronDown />Ch</RemoteKey>
        <RemoteKey ecpKey="InputTuner" label="Antenna / Live TV"><RadioTower /></RemoteKey>
        <RemoteKey ecpKey="ChannelUp" label="Channel up"><ChevronUp />Ch</RemoteKey>
      </div>
    </ModuleCard>
  );
}
