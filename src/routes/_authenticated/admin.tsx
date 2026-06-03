import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Reservation, type Profile } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ReservationRow } from "./reservations";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Správa — Rezervo" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", "all"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, resource:resources(*), profile:profiles(*)")
        .order("start_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Reservation & { profile: Profile | null })[];
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

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-10 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Přístup zamítnut</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tato sekce je pouze pro správce.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Správa rezervací</h1>
        <p className="text-sm text-muted-foreground">
          Posledních 100 rezervací napříč všemi uživateli.
        </p>
      </header>
      <div className="space-y-3">
        {reservations.map((r) => (
          <ReservationRow
            key={r.id}
            r={r}
            onCancel={() => cancel.mutate(r.id)}
            onDelete={() => remove.mutate(r.id)}
            showUser={r.profile?.display_name ?? r.profile?.email ?? r.user_id.slice(0, 8)}
          />
        ))}
        {reservations.length === 0 && (
          <p className="text-sm text-muted-foreground">Žádné rezervace.</p>
        )}
      </div>
    </div>
  );
}