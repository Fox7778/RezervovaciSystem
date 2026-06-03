import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, type Resource, type Reservation } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Když je zadán, je picker zdroje zamknutý na tento zdroj. */
  lockedResource?: Resource | null;
  /** Když je zadán, dialog edituje existující rezervaci. */
  editing?: Reservation | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReservationFormDialog({ open, onOpenChange, lockedResource, editing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [resourceId, setResourceId] = useState<string>("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Resource[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setResourceId(editing.resource_id);
      setStart(toLocalInput(editing.start_time));
      setEnd(toLocalInput(editing.end_time));
      setPurpose(editing.purpose ?? "");
    } else {
      setResourceId(lockedResource?.id ?? "");
      setStart("");
      setEnd("");
      setPurpose("");
    }
  }, [open, editing, lockedResource]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!resourceId) return toast.error("Vyber zdroj.");
    if (!purpose.trim()) return toast.error("Vyplň účel rezervace.");
    const s = new Date(start);
    const en = new Date(end);
    if (!(s < en)) return toast.error("Konec musí být po začátku.");
    if (!editing && s < new Date()) return toast.error("Začátek nesmí být v minulosti.");

    setBusy(true);
    let colQuery = supabase
      .from("reservations")
      .select("id")
      .eq("resource_id", resourceId)
      .lt("start_time", en.toISOString())
      .gt("end_time", s.toISOString());
    if (editing) colQuery = colQuery.neq("id", editing.id);

    const { data: collisions, error: colErr } = await colQuery;
    if (colErr) {
      setBusy(false);
      return toast.error(colErr.message);
    }
    if (collisions && collisions.length > 0) {
      setBusy(false);
      return toast.error("V tomto čase je zdroj již rezervován.");
    }

    const payload = {
      resource_id: resourceId,
      user_id: user.id,
      start_time: s.toISOString(),
      end_time: en.toISOString(),
      purpose: purpose.trim(),
    };
    const { error } = editing
      ? await supabase.from("reservations").update(payload).eq("id", editing.id)
      : await supabase.from("reservations").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Rezervace upravena." : "Rezervace vytvořena.");
    qc.invalidateQueries({ queryKey: ["reservations"] });
    onOpenChange(false);
  };

  const locked = !!lockedResource && !editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Upravit rezervaci" : "Nová rezervace"}
          </DialogTitle>
          <DialogDescription>
            Zkontrolujeme překryv s ostatními rezervacemi daného zdroje.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Zdroj</Label>
            <Select
              value={resourceId}
              onValueChange={setResourceId}
              disabled={locked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyber učebnu nebo vybavení" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.type}
                    {r.location ? ` · ${r.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Od</Label>
              <Input
                id="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Do</Label>
              <Input
                id="end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Účel rezervace</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="např. Cvičení DBS – skupina 3A"
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Ukládám…" : editing ? "Uložit změny" : "Rezervovat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}