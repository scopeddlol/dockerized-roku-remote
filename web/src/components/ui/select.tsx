import { Check, ChevronDown } from "lucide-react";
import { Select as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; group?: string };

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const o of options) {
      const g = o.group ?? "";
      map.set(g, [...(map.get(g) ?? []), o]);
    }
    return [...map.entries()];
  }, [options]);

  return (
    <S.Root value={value} onValueChange={onValueChange}>
      <S.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background/40 px-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 data-[placeholder]:text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon>
          <ChevronDown className="size-4 opacity-60" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border bg-card-solid shadow-2xl"
        >
          <S.Viewport className="p-1">
            {groups.map(([group, opts]) => (
              <S.Group key={group}>
                {group && (
                  <S.Label className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {group}
                  </S.Label>
                )}
                {opts.map((o) => (
                  <S.Item
                    key={o.value}
                    value={o.value}
                    className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-2.5 pr-8 text-sm outline-none data-[highlighted]:bg-key"
                  >
                    <S.ItemText>{o.label}</S.ItemText>
                    <S.ItemIndicator className="absolute right-2.5">
                      <Check className="size-4 text-primary" />
                    </S.ItemIndicator>
                  </S.Item>
                ))}
              </S.Group>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
