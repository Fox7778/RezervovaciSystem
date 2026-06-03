import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  supabase,
  type Reservation,
  type Profile,
  type ReservationStatus,
  computeStatus,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar, Clock, MapPin, Pencil, Search, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ReservationFormDialog } from "@/components/ReservationFormDialog";

type FullReservation = Reservation & { profile?: Profile | null };

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({ meta: [{ title: "Dashboard rezervací — Rezervo" }] }),
  component: ReservationsPage,
});

const STATUS_LABEL: Record<ReservationStatus, string> = {
  future: "Budoucí",
  active: "Aktivní",
  expired: "Ukončená",
};

function ReservationsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, resource:resources(*), profile:profiles(*)")
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as FullReservation[];
    },
  });

  const types = useMemo(
    () =>
      Array.from(new Set(data.map((r) => r.resource?.type).filter(Boolean))) as string[],
    [data],
  );

  const users = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of data) {
      const label = r.profile?.display_name ?? r.profile?.email ?? r.user_id.slice(0, 8);
      if (!m.has(r.user_id)) m.set(r.user_id, label);
    }
    return Array.from(m.entries());
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((r) => {
      const st = computeStatus(r);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (typeFilter !== "all" && r.resource?.type !== typeFilter) return false;
      if (isAdmin && userFilter !== "all" && r.user_id !== userFilter) return false;
      if (needle) {
        const hay = `${r.resource?.name ?? ""} ${r.purpose ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, statusFilter, typeFilter, userFilter, isAdmin]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rezervace smazána.");
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard rezervací</h1>
        <p className="text-sm text-muted-foreground">
          Všechny rezervace napříč studenty. {isAdmin ? "Jako správce můžeš upravovat a mazat libovolnou rezervaci." : "Upravovat můžeš jen své vlastní."}
        </p>
      </header>

      <div className="glass grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat podle zdroje nebo účelu…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Typ zdroje" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger><SelectValue placeholder="Stav" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="future">Budoucí</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="expired">Ukončené</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="lg:col-span-4"><SelectValue placeholder="Uživatel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všichni uživatelé</SelectItem>
              {users.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Načítám…</p>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Žádné rezervace neodpovídají filtru.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((r) => {
            const st = computeStatus(r);
            const mine = r.user_id === user?.id;
            const canEdit = isAdmin || mine;
            const variant: "default" | "secondary" | "outline" =
              st === "active" ? "default" : st === "future" ? "outline" : "secondary";
            return (
              <article key={r.id} className="glass flex flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{r.resource?.name ?? "Zdroj"}</h3>
                      {r.resource?.type && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                          {r.resource.type}
                        </Badge>
                      )}
                      <Badge variant={variant}>{STATUS_LABEL[st]}</Badge>
                    </div>
                    {r.resource?.location && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {r.resource.location}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Upravit"
                        onClick={() => {
                          setEditing(r);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Smazat">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Smazat rezervaci?</AlertDialogTitle>
                            <AlertDialogDescription>Akce je nevratná.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zrušit</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(r.id)}>
                              Smazat
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(r.start_time), "d. M. yyyy HH:mm")} —{" "}
                    {format(new Date(r.end_time), "d. M. yyyy HH:mm")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {r.profile?.display_name ?? r.profile?.email ?? r.user_id.slice(0, 8)}
                  </span>
                </div>
                {r.purpose && (
                  <p className="rounded-md bg-secondary/40 p-2 text-sm">{r.purpose}</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ReservationFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}