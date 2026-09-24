import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import * as React from "react";
import { Drawer } from "vaul";
import { useIsDesktop } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

/**
 * A side panel on desktop and a swipe-to-dismiss bottom drawer on phones.
 * Same content, the right gesture for each form factor.
 */
export function Sheet(props: SheetProps) {
  return useIsDesktop() ? <SidePanel {...props} /> : <BottomDrawer {...props} />;
}

type Parts = { Title: typeof Dialog.Title; Description: typeof Dialog.Description };

function Header({ title, description, parts: { Title, Description } }: {
  title: string;
  description?: string;
  parts: Parts;
}) {
  return (
    <div className="space-y-1">
      <Title className="text-lg font-semibold tracking-tight">{title}</Title>
      <Description className={description ? "text-sm text-muted-foreground" : "sr-only"}>
        {description ?? title}
      </Description>
    </div>
  );
}

function SidePanel({ open, onOpenChange, title, description, children, footer, wide }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "anim-sheet fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] flex-col overflow-hidden rounded-3xl border bg-card-solid shadow-2xl focus:outline-none",
            wide ? "max-w-2xl" : "max-w-md",
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <Header title={title} description={description} parts={Dialog} />
            <Dialog.Close className="-mr-2 -mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-key hover:text-foreground">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          {footer && <div className="border-t px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BottomDrawer({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] border-t bg-card-solid focus:outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="px-5 pb-3 pt-4">
            <Header title={title} description={description} parts={Drawer as unknown as Parts} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
          {footer && <div className="pb-safe border-t px-5 pt-3">{footer}</div>}
          {!footer && <div className="pb-safe" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
