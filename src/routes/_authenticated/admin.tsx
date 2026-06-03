import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldOff, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Správa — Rezervo" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const nowIso = new Date().toISOString();

  const { data: expired = [] } = useQuery({
    queryKey: ["reservations", "expired"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, end_time")
        .lt("end_time", nowIso);
      if (error) throw error;
      return data as { id: string; end_time: string }[];
    },
  });

  const purge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .lt("end_time", new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expirované rezervace byly smazány.");
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
        <p className="mt-1 text-sm text-muted-foreground">Tato sekce je pouze pro správce.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Správa</h1>
        <p className="text-sm text-muted-foreground">
          Nástroje pro správce. Veškeré rezervace upravuj přímo na dashboardu.
        </p>
      </header>

      <div className="glass space-y-3 rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Vyčistit expirované rezervace</h2>
        <p className="text-sm text-muted-foreground">
          V databázi je aktuálně <strong>{expired.length}</strong> rezervací s ukončeným časem.
          Smazáním uvolníš historii a udržíš databázi přehlednou.
        </p>
        <Button
          variant="destructive"
          disabled={expired.length === 0 || purge.isPending}
          onClick={() => purge.mutate()}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {purge.isPending ? "Mažu…" : `Smazat ${expired.length} rezervací`}
        </Button>
      </div>
    </div>
  );
}