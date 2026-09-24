import { Command } from "lucide-react";
import { ModuleCard } from "@/components/module-card";

export const SHORTCUTS: [string, string, string][] = [
  ["ArrowUp", "↑", "Up"],
  ["ArrowDown", "↓", "Down"],
  ["ArrowLeft", "←", "Left"],
  ["ArrowRight", "→", "Right"],
  ["Enter", "Enter", "Select"],
  ["Backspace", "⌫", "Back"],
  ["Escape", "Esc", "Home"],
  [" ", "Space", "Play"],
  ["[", "[", "Rev"],
  ["]", "]", "Fwd"],
  ["-", "−", "VolumeDown"],
  ["=", "+", "VolumeUp"],
  ["m", "M", "VolumeMute"],
  ["*", "*", "Info"],
];

const LABELS: Record<string, string> = {
  Select: "OK", Play: "Play / pause", Rev: "Rewind", Fwd: "Fast forward",
  VolumeDown: "Volume down", VolumeUp: "Volume up", VolumeMute: "Mute", Info: "Options",
};

export function Shortcuts() {
  return (
    <ModuleCard title="Keyboard shortcuts" icon={Command}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {SHORTCUTS.map(([, cap, key]) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{LABELS[key] ?? key}</dt>
            <dd>
              <kbd className="rounded-md border bg-key px-1.5 py-0.5 font-mono text-xs">{cap}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </ModuleCard>
  );
}
