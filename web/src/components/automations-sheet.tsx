import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Clock, Copy, GripVertical, Keyboard, LayoutGrid, Loader2, Pencil, Plus, Trash2, Type,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApps, useMacros, useSaveMacros, useStatus, type Macro, type Step, type StepType } from "@/lib/api";
import { PICKER_BRANDS } from "@/lib/brands";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { describeSteps } from "@/modules/automations";
import { MACRO_ICONS, MacroIcon } from "./macro-icon";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, type Option } from "./ui/select";
import { Sheet } from "./ui/sheet";

const KEYS: Option[] = [
  ...["PowerOn", "PowerOff", "Power"].map((k) => ({ value: k, label: k, group: "Power" })),
  ...["Home", "Back", "Select", "Up", "Down", "Left", "Right", "Info"].map((k) => ({ value: k, label: k, group: "Navigation" })),
  ...["Play", "Rev", "Fwd", "InstantReplay"].map((k) => ({ value: k, label: k, group: "Playback" })),
  ...["VolumeUp", "VolumeDown", "VolumeMute"].map((k) => ({ value: k, label: k, group: "Volume" })),
  ...["Search", "Backspace", "Enter", "ChannelUp", "ChannelDown", "InputTuner", "InputHDMI1", "InputHDMI2", "InputHDMI3", "InputHDMI4", "InputAV1", "FindRemote"].map(
    (k) => ({ value: k, label: k, group: "Other" }),
  ),
];

const STEP_META: Record<StepType, { label: string; icon: typeof Keyboard; initial: string | number }> = {
  keypress: { label: "Press", icon: Keyboard, initial: "Home" },
  launch: { label: "Open", icon: LayoutGrid, initial: "" },
  delay: { label: "Wait", icon: Clock, initial: 1500 },
  text: { label: "Type", icon: Type, initial: "" },
};

type DraftStep = Step & { uid: string };
type Draft = { index: number | null; name: string; icon: string; steps: DraftStep[] };

const uid = () => Math.random().toString(36).slice(2);

function copyText(text: string) {
  // navigator.clipboard needs HTTPS; LAN installs are usually plain HTTP.
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.append(el);
  el.select();
  document.execCommand("copy");
  el.remove();
  return Promise.resolve();
}

export function AutomationsSheet() {
  const { panel, open } = useUI();
  const { data: macros = [] } = useMacros();
  const save = useSaveMacros();
  const [draft, setDraft] = useState<Draft | null>(null);

  async function persist(next: Macro[], message: string) {
    try {
      await save.mutateAsync(next);
      toast.success(message);
      return true;
    } catch (e) {
      toast.error("Couldn't save", { description: (e as Error).message });
      return false;
    }
  }

  function edit(index: number | null) {
    const m = index == null ? null : macros[index];
    setDraft({
      index,
      name: m?.name ?? "",
      icon: m?.icon ?? "zap",
      steps: (m?.steps ?? [{ type: "keypress", value: "PowerOn" }]).map((s) => ({ ...s, uid: uid() })),
    });
  }

  async function commit() {
    if (!draft) return;
    const macro: Macro = {
      name: draft.name.trim(),
      icon: draft.icon,
      steps: draft.steps.map(({ type, value }) => ({ type, value })),
    };
    const next = [...macros];
    if (draft.index == null) next.push(macro);
    else next[draft.index] = macro;
    if (await persist(next, `Saved "${macro.name}"`)) setDraft(null);
  }

  return (
    <Sheet
      open={panel === "automations"}
      onOpenChange={(o) => {
        open(o ? "automations" : null);
        if (!o) setDraft(null);
      }}
      wide
      title={draft ? (draft.index == null ? "New automation" : "Edit automation") : "Automations"}
      description={
        draft
          ? "Steps run top to bottom. Drag to reorder."
          : "One-tap scenes. Each one is also a webhook for Shortcuts, Home Assistant or cron."
      }
      footer={
        draft ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              <ArrowLeft />
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={commit}
              disabled={!draft.name.trim() || !draft.steps.length || save.isPending}
            >
              {save.isPending && <Loader2 className="animate-spin" />}
              Save automation
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => edit(null)}>
            <Plus />
            New automation
          </Button>
        )
      }
    >
      {draft ? (
        <Editor draft={draft} setDraft={setDraft} />
      ) : (
        <ul className="space-y-2">
          {macros.map((m, i) => (
            <li key={m.name} className="flex items-center gap-3 rounded-2xl border bg-background/40 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-fuchsia-500/15 text-primary">
                <MacroIcon icon={m.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{describeSteps(m)}</div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy webhook for ${m.name}`}
                title="Copy webhook (curl)"
                onClick={() =>
                  copyText(`curl -X POST "${location.origin}/api/macro/${encodeURIComponent(m.name)}"`).then(() =>
                    toast.success("Webhook copied", { description: "Paste it into Shortcuts, cron or Home Assistant" }),
                  )
                }
              >
                <Copy />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${m.name}`} onClick={() => edit(i)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${m.name}`}
                className="hover:text-destructive"
                onClick={() => persist(macros.filter((_, j) => j !== i), `Deleted "${m.name}"`)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
          {macros.length === 0 && (
            <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No automations yet.
            </li>
          )}
        </ul>
      )}
    </Sheet>
  );
}

function Editor({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setStep = (i: number, step: DraftStep) =>
    update({ steps: draft.steps.map((s, j) => (j === i ? step : s)) });

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = draft.steps.map((s) => s.uid);
    update({ steps: arrayMove(draft.steps, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))) });
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</span>
        <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Movie night" maxLength={60} autoFocus />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Icon</span>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {[...Object.keys(MACRO_ICONS), ...PICKER_BRANDS].map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={icon}
              title={icon}
              onClick={() => update({ icon })}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl bg-key text-muted-foreground transition-all hover:bg-key-hover hover:text-foreground",
                draft.icon === icon && "bg-primary/15 text-primary ring-2 ring-primary",
              )}
            >
              <MacroIcon icon={icon} className="size-[18px]" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Steps</span>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd}>
          <SortableContext items={draft.steps.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {draft.steps.map((step, i) => (
                <StepRow
                  key={step.uid}
                  index={i}
                  step={step}
                  onChange={(s) => setStep(i, s)}
                  onRemove={() => update({ steps: draft.steps.filter((_, j) => j !== i) })}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(Object.keys(STEP_META) as StepType[]).map((type) => {
            const { label, icon: Icon, initial } = STEP_META[type];
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                disabled={draft.steps.length >= 50}
                onClick={() => update({ steps: [...draft.steps, { type, value: initial, uid: uid() }] })}
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepRow({
  index,
  step,
  onChange,
  onRemove,
}: {
  index: number;
  step: DraftStep;
  onChange: (s: DraftStep) => void;
  onRemove: () => void;
}) {
  const { data: status } = useStatus();
  const { data: apps = [] } = useApps(!!status?.configured);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.uid });
  const Icon = STEP_META[step.type].icon;

  const launchOptions: Option[] = apps.map((a) => ({
    value: a.id,
    label: a.name,
    group: a.type === "tvin" ? "Inputs" : "Apps",
  }));
  if (step.value && !launchOptions.some((o) => o.value === step.value)) {
    launchOptions.unshift({ value: String(step.value), label: `ID ${step.value}`, group: "Current" });
  }

  let editor: React.ReactNode;
  if (step.type === "keypress") {
    editor = <Select value={String(step.value)} onValueChange={(v) => onChange({ ...step, value: v })} options={KEYS} />;
  } else if (step.type === "launch") {
    editor = (
      <Select
        value={String(step.value)}
        onValueChange={(v) => onChange({ ...step, value: v })}
        options={launchOptions}
        placeholder={apps.length ? "Choose an app or input" : "Connect a TV to list apps"}
      />
    );
  } else if (step.type === "delay") {
    editor = (
      <div className="relative">
        <Input
          type="number"
          min={0}
          max={30}
          step={0.5}
          value={Number(step.value) / 1000}
          onChange={(e) => onChange({ ...step, value: Math.round(Number(e.target.value) * 1000) })}
          className="h-10 pr-20"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          seconds
        </span>
      </div>
    );
  } else {
    editor = (
      <Input
        value={String(step.value)}
        onChange={(e) => onChange({ ...step, value: e.target.value })}
        placeholder="Text to type"
        maxLength={200}
        className="h-10"
      />
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border bg-background/50 p-2",
        isDragging && "relative z-10 shadow-2xl ring-2 ring-primary/50",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder step ${index + 1}`}
        className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex w-[4.5rem] shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {STEP_META[step.type].label}
      </div>
      <div className="min-w-0 flex-1">{editor}</div>
      <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove step ${index + 1}`} className="hover:text-destructive">
        <Trash2 />
      </Button>
    </li>
  );
}
