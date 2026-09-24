import {
  Baby, BedDouble, Clapperboard, Coffee, Film, Gamepad2, Laptop, Monitor, Moon, Music,
  Newspaper, Play, Popcorn, Power, RadioTower, Sparkles, Star, Sun, Timer, Trophy, Tv, Zap,
  type LucideIcon,
} from "lucide-react";
import { brandBySlug, PICKER_BRANDS } from "@/lib/brands";
import { useIsDark } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export const MACRO_ICONS: Record<string, LucideIcon> = {
  zap: Zap, clapperboard: Clapperboard, popcorn: Popcorn, film: Film, tv: Tv, play: Play,
  gamepad: Gamepad2, monitor: Monitor, laptop: Laptop, music: Music, "radio-tower": RadioTower,
  trophy: Trophy, newspaper: Newspaper, moon: Moon, sun: Sun, coffee: Coffee, bed: BedDouble,
  baby: Baby, timer: Timer, star: Star, sparkles: Sparkles, power: Power,
};

/**
 * An automation's icon may be a Lucide icon name, a bundled brand slug
 * ("youtube"), or (from older configs) an emoji.
 */
export function MacroIcon({ icon, className }: { icon: string; className?: string }) {
  const dark = useIsDark();
  const Lucide = MACRO_ICONS[icon];
  if (Lucide) return <Lucide className={cn("size-5", className)} />;
  if (PICKER_BRANDS.includes(icon)) {
    const b = brandBySlug(icon);
    return <img src={dark ? b.dark : b.light} alt="" className={cn("size-5 object-contain", className)} />;
  }
  return <span className={cn("text-lg leading-none", className)}>{icon || "⚡"}</span>;
}
