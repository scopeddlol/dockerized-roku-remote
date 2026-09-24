import { Delete, Keyboard as KeyboardIcon, Search, SendHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModuleCard } from "@/components/module-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommand, api } from "@/lib/api";

export function Keyboard() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const cmd = useCommand();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.text(text);
      setText("");
    } catch (err) {
      toast.error("Couldn't type on the TV", { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <ModuleCard title="Keyboard" icon={KeyboardIcon}>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type into a search box…"
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!text || sending} aria-label="Send text">
          <SendHorizontal />
        </Button>
      </form>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => cmd.key("Search")}><Search />Search</Button>
        <Button variant="secondary" onClick={() => cmd.key("Backspace")}><Delete />Delete</Button>
      </div>
    </ModuleCard>
  );
}
