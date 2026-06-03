import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Resource } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, MapPin, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ReserveDialog } from "@/components/ReserveDialog";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({ meta: [{ title: "Zdroje — Rezervo" }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reserveOpen, setReserveOpen] = useState(false);
  const [activeResource, setActiveResource] = useState<Resource | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Resource[];
    },
  });

  const types = useMemo(
    () => Array.from(new Set(resources.map((r) => r.type))).sort(),
    [resources],
  );

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        return (
          r.name.toLowerCase().includes(needle) ||
          r.type.toLowerCase().includes(needle) ||
          (r.location ?? "").toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [resources, q, typeFilter]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zdroj smazán.");
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zdroje</h1>
          <p className="text-sm text-muted-foreground">
            Učebny, laboratoře a vybavení dostupné k rezervaci.
          </p>
        </div>
        {isAdmin && <ResourceFormDialog mode="create" />}
      </div>

      <div className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat podle názvu, typu, místa…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Načítám zdroje…</p>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Žádné zdroje neodpovídají filtru.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="glass group flex flex-col rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
                    {r.type}
                  </Badge>
                  <h3 className="text-lg font-semibold leading-tight">{r.name}</h3>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-mono text-primary">
                  ×{r.quantity}
                </span>
              </div>
              {r.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{r.description}</p>
              )}
              {r.location && (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {r.location}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setActiveResource(r);
                    setReserveOpen(true);
                  }}
                >
                  <CalendarPlus className="mr-1 h-4 w-4" /> Rezervovat
                </Button>
                {isAdmin && (
                  <>
                    <ResourceFormDialog mode="edit" resource={r} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="Smazat">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat zdroj?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Smaže i navázané rezervace. Akce je nevratná.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(r.id)}>
                            Smazat
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ReserveDialog
        resource={activeResource}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
      />
    </div>
  );
}

function ResourceFormDialog({
  mode,
  resource,
}: {
  mode: "create" | "edit";
  resource?: Resource;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: resource?.name ?? "",
    type: resource?.type ?? "",
    description: resource?.description ?? "",
    location: resource?.location ?? "",
    quantity: resource?.quantity ?? 1,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type.trim() || form.quantity < 1) {
      toast.error("Vyplň název, typ a množství ≥ 1.");
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      quantity: Number(form.quantity),
    };
    const { error } =
      mode === "create"
        ? await supabase.from("resources").insert(payload)
        : await supabase.from("resources").update(payload).eq("id", resource!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "create" ? "Zdroj vytvořen." : "Zdroj upraven.");
    qc.invalidateQueries({ queryKey: ["resources"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Nový zdroj
          </Button>
        ) : (
          <Button size="icon" variant="ghost" aria-label="Upravit">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nový zdroj" : "Upravit zdroj"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="učebna, laboratoř, vybavení…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Množství</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Místo</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="např. Pavilon A, 2. patro"
            />
          </div>
          <div className="space-y-2">
            <Label>Popis</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Ukládám…" : mode === "create" ? "Vytvořit" : "Uložit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}