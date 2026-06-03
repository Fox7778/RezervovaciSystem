import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Reservation } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({ meta: [{ title: "Moje rezervace — Rezervo" }] }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, resource:resources(*)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rezervace zrušena.");
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <h1 className="text-3xl font-bold tracking-tight">Moje rezervace</h1>
        <p className="text-sm text-muted-foreground">Tvoje aktivní i minulé rezervace.</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Načítám…</p>
      ) : data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Zatím nemáš žádné rezervace. Vyber si zdroj v sekci „Zdroje".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <ReservationRow
              key={r.id}
              r={r}
              onCancel={() => cancel.mutate(r.id)}
              onDelete={() => remove.mutate(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReservationRow({
  r,
  onCancel,
  onDelete,
  showUser,
}: {
  r: Reservation & { resource?: { name: string; type: string; location: string | null } | null };
  onCancel?: () => void;
  onDelete?: () => void;
  showUser?: string | null;
}) {
  const status = r.status;
  const past = new Date(r.end_time) < new Date();
  const variant: "default" | "secondary" | "destructive" =
    status === "cancelled" ? "destructive" : past ? "secondary" : "default";

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{r.resource?.name ?? "Zdroj"}</h3>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {r.resource?.type}
          </Badge>
          <Badge variant={variant}>
            {status === "cancelled" ? "zrušena" : past ? "proběhla" : "aktivní"}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(r.start_time), "d. M. yyyy HH:mm")} —{" "}
            {format(new Date(r.end_time), "d. M. yyyy HH:mm")}
          </span>
          {r.resource?.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {r.resource.location}
            </span>
          )}
          {showUser && <span className="font-mono">{showUser}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        {onCancel && status !== "cancelled" && !past && (
          <Button size="sm" variant="outline" onClick={onCancel}>
            Zrušit
          </Button>
        )}
        {onDelete && (
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Smazat">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}