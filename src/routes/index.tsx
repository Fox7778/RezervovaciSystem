import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarRange, ShieldCheck, Zap, Database, Filter, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rezervo — moderní rezervační systém učeben" },
      {
        name: "description",
        content:
          "Rezervační systém učeben a vybavení postavený na Supabase. Rychlé rezervace bez kolizí, role studenta a správce.",
      },
      { property: "og:title", content: "Rezervo — rezervační systém" },
      {
        property: "og:description",
        content: "Rychlé rezervace učeben a vybavení s kontrolou kolizí.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl glass p-8 sm:p-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" /> DBS · IT3A · Závěrečný projekt
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Rezervuj učebny a vybavení <span className="text-gradient">bez kolizí.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Rezervo je moderní rezervační systém postavený na Supabase Postgres + Auth.
            Studenti rezervují, správci spravují — vše s reálnou kontrolou časových oken.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="glow">
              <Link to={user ? "/resources" : "/auth"}>
                {user ? "Otevřít zdroje" : "Začít rezervovat"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Co umí</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Database className="h-5 w-5" />}
          title="Plné CRUD nad Supabase"
          desc="Create, read, update, delete přímo přes supabase-js klienta. Žádné mezivrstvy."
        />
        <Feature
          icon={<CalendarRange className="h-5 w-5" />}
          title="Kontrola kolizí"
          desc="Rezervace ověřuje překryv časových oken — žádný dvojitý booking."
        />
        <Feature
          icon={<Filter className="h-5 w-5" />}
          title="Filtrování a hledání"
          desc="Najdi zdroj podle názvu, typu i dostupnosti v daném termínu."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Role + RLS"
          desc="Student vs. správce, vynucené Row Level Security politikami v Postgres."
        />
        <Feature
          icon={<Users className="h-5 w-5" />}
          title="Auth včetně profilů"
          desc="Registrace e-mailem, automatické založení profilu přes trigger."
        />
        <Feature
          icon={<Zap className="h-5 w-5" />}
          title="Reaktivní UI"
          desc="TanStack Query + optimistic updates. Žádné F5."
        />
      </section>
    </AppShell>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
      <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
