import {
  Command, Gamepad2, HdmiPort, Keyboard as KeyboardIcon, LayoutGrid, MonitorPlay, Play,
  RadioTower, Volume2, Workflow, type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { defaults, type Zone } from "@/lib/store";
import { Apps } from "./apps";
import { Automations } from "./automations";
import { Inputs } from "./inputs";
import { Keyboard } from "./keyboard";
import { Navigation } from "./navigation";
import { NowPlaying } from "./now-playing";
import { Playback } from "./playback";
import { PowerVolume } from "./power-volume";
import { Shortcuts } from "./shortcuts";
import { Tuner } from "./tuner";

export type ModuleDef = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  zone: Zone;
  hiddenByDefault?: boolean;
  component: ComponentType;
};

/**
 * Every module the UI can show. To add one: build a component in this
 * folder and add an entry here. It automatically appears in Customize, and
 * existing users get it appended to their saved layout.
 */
export const MODULES: ModuleDef[] = [
  { id: "power-volume", title: "Power & volume", description: "Power, mute, volume up/down", icon: Volume2, zone: "remote", component: PowerVolume },
  { id: "navigation", title: "D-pad", description: "Arrows, OK, back, home, options", icon: Gamepad2, zone: "remote", component: Navigation },
  { id: "playback", title: "Playback", description: "Play/pause, rewind, fast-forward, replay", icon: Play, zone: "remote", component: Playback },
  { id: "keyboard", title: "Keyboard", description: "Type into TV search and login boxes", icon: KeyboardIcon, zone: "remote", component: Keyboard },
  { id: "tuner", title: "Live TV", description: "Channel up/down and antenna input", icon: RadioTower, zone: "remote", hiddenByDefault: true, component: Tuner },
  { id: "now-playing", title: "Now playing", description: "Power state, current app, progress", icon: MonitorPlay, zone: "dashboard", component: NowPlaying },
  { id: "automations", title: "Automations", description: "One-tap scenes you define", icon: Workflow, zone: "dashboard", component: Automations },
  { id: "inputs", title: "Inputs", description: "Switch HDMI, AV and antenna", icon: HdmiPort, zone: "dashboard", component: Inputs },
  { id: "apps", title: "Apps", description: "Every installed channel, with search", icon: LayoutGrid, zone: "dashboard", component: Apps },
  { id: "shortcuts", title: "Shortcuts", description: "Desktop keyboard shortcut cheat sheet", icon: Command, zone: "dashboard", hiddenByDefault: true, component: Shortcuts },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));

defaults.layout = {
  remote: MODULES.filter((m) => m.zone === "remote").map((m) => m.id),
  dashboard: MODULES.filter((m) => m.zone === "dashboard").map((m) => m.id),
};
defaults.hidden = MODULES.filter((m) => m.hiddenByDefault).map((m) => m.id);
