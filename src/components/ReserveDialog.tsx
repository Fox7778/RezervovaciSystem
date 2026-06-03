import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, type Resource } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function ReserveDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !user) return;
    const s = new Date(start);
    const en = new Date(end);
    if (!(s < en)) {
      toast.error("Konec musí být po začátku.");
      return;
    }
    if (s < new Date()) {
      toast.error("Začátek nesmí být v minulosti.");
      return;
    }

    setBusy(true);
    // Kolizní kontrola: existuje rezervace stejného zdroje, kde se intervaly překrývají?
    const { data: collisions, error: colErr } = await supabase
      .from("reservations")
      .select("id")
      .eq("resource_id", resource.id)
      .neq("status", "cancelled")
      .lt("start_time", en.toISOString())
      .gt("end_time", s.toISOString());

    if (colErr) {
      setBusy(false);
      toast.error(colErr.message);
      return;
    }
    if (collisions && collisions.length > 0) {
      setBusy(false);
      toast.error("V tomto čase je zdroj již rezervován.");
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      resource_id: resource.id,
      user_id: user.id,
      start_time: s.toISOString(),
      end_time: en.toISOString(),
      status: "confirmed",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rezervace vytvořena.");
    qc.invalidateQueries({ queryKey: ["reservations"] });
    onOpenChange(false);
    setStart("");
    setEnd("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rezervovat {resource?.name}</DialogTitle>
          <DialogDescription>
            Zvol časové okno. Zkontrolujeme kolize s ostatními rezervacemi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start">Začátek</Label>
            <Input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Konec</Label>
            <Input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Ukládám…" : "Rezervovat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}