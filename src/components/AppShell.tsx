import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarCheck, LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut, user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-primary)] glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Rezervo</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Lab &middot; učebny &middot; vybavení
              </div>
            </div>
          </Link>

          {user ? (
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/resources" icon={<LayoutGrid className="h-4 w-4" />} label="Zdroje" />
              <NavLink
                to="/reservations"
                icon={<CalendarCheck className="h-4 w-4" />}
                label="Moje rezervace"
              />
              {isAdmin && (
                <NavLink
                  to="/admin"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Správa"
                />
              )}
            </nav>
          ) : null}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-medium">
                    {profile?.display_name ?? user.email}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isAdmin ? "Správce" : "Student"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Odhlásit">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Přihlásit se</Link>
              </Button>
            )}
          </div>
        </div>
        {user ? (
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            <NavLink to="/resources" icon={<LayoutGrid className="h-4 w-4" />} label="Zdroje" />
            <NavLink
              to="/reservations"
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Rezervace"
            />
            {isAdmin && (
              <NavLink to="/admin" icon={<ShieldCheck className="h-4 w-4" />} label="Správa" />
            )}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      {icon}
      {label}
    </Link>
  );
}