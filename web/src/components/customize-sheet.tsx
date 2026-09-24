import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownUp, GripVertical, RotateCcw } from "lucide-react";
import { MODULE_BY_ID } from "@/modules/registry";
import { usePrefs, type Zone } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { Switch } from "./ui/switch";
import { Tooltip } from "./ui/tooltip";

const ZONES: { zone: Zone; title: string; hint: string }[] = [
  { zone: "remote", title: "Remote", hint: "Left column on desktop · Remote tab on phones" },
  { zone: "dashboard", title: "Dashboard", hint: "Right column on desktop · Launch tab on phones" },
];

export function CustomizeSheet() {
  const { panel, open } = useUI();
  const resetLayout = usePrefs((s) => s.resetLayout);

  return (
    <Sheet
      open={panel === "customize"}
      onOpenChange={(o) => open(o ? "customize" : null)}
      title="Customize"
      description="Show, hide and reorder modules. Saved on this device."
      footer={
        <Button variant="ghost" className="w-full" onClick={resetLayout}>
          <RotateCcw />
          Reset to default layout
        </Button>
      }
    >
      <div className="space-y-6">
        {ZONES.map((z) => (
          <ZoneList key={z.zone} {...z} />
        ))}
      </div>
    </Sheet>
  );
}

function ZoneList({ zone, title, hint }: { zone: Zone; title: string; hint: string }) {
  const ids = usePrefs((s) => s.layout[zone]);
  const setLayout = usePrefs((s) => s.setLayout);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const layout = usePrefs.getState().layout;
    const list = layout[zone];
    const next = arrayMove(list, list.indexOf(String(active.id)), list.indexOf(String(over.id)));
    setLayout({ ...layout, [zone]: next });
  }

  return (
    <div>
      <div className="mb-2 px-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {ids.map((id) => (
              <Row key={id} id={id} zone={zone} />
            ))}
            {ids.length === 0 && (
              <li className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No modules here
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Row({ id, zone }: { id: string; zone: Zone }) {
  const mod = MODULE_BY_ID[id];
  const visible = usePrefs((s) => !s.hidden.includes(id));
  const toggle = usePrefs((s) => s.toggleModule);
  const move = usePrefs((s) => s.moveModule);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  if (!mod) return null;
  const Icon = mod.icon;
  const other: Zone = zone === "remote" ? "dashboard" : "remote";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border bg-background/50 p-2 pr-3 transition-shadow",
        isDragging && "relative z-10 shadow-2xl ring-2 ring-primary/50",
        !visible && "opacity-60",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${mod.title}`}
        className="flex h-10 w-7 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-key active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-key text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{mod.title}</div>
        <div className="truncate text-xs text-muted-foreground">{mod.description}</div>
      </div>
      <Tooltip label={`Move to ${other === "remote" ? "Remote" : "Dashboard"}`}>
        <Button variant="ghost" size="icon-sm" onClick={() => move(id, other)} aria-label={`Move ${mod.title} to ${other}`}>
          <ArrowDownUp />
        </Button>
      </Tooltip>
      <Switch checked={visible} onCheckedChange={() => toggle(id)} aria-label={`Show ${mod.title}`} />
    </li>
  );
}
