import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Přihlášení — Rezervo" },
      { name: "description", content: "Přihlas se nebo si vytvoř účet v Rezervu." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/resources" });
  }, [user, loading, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <Link to="/" className="relative inline-flex items-center gap-2 text-sm font-medium">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)] glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          Rezervo
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold tracking-tight">
            Rezervuj <span className="text-gradient">chytře</span>,<br /> rezervuj jednou.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Přihlas se a získej přístup k učebnám, laboratořím a vybavení tvé školy.
            Bez kolizí, bez papírování.
          </p>
        </div>
        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rezervo · DBS projekt
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Přihlášení</TabsTrigger>
              <TabsTrigger value="signup">Registrace</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Přihlášeno");
  };

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
      <div>
        <h1 className="text-2xl font-semibold">Vítej zpět</h1>
        <p className="text-sm text-muted-foreground">Přihlas se ke svému účtu.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-email">E-mail</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pwd">Heslo</Label>
        <Input id="si-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Přihlašování…" : "Přihlásit se"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Účet vytvořen. Můžeš se přihlásit.");
  };

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
      <div>
        <h1 className="text-2xl font-semibold">Vytvoř si účet</h1>
        <p className="text-sm text-muted-foreground">Registrace zdarma, role „student" je výchozí.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-name">Zobrazované jméno</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">E-mail</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pwd">Heslo</Label>
        <Input id="su-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Registruji…" : "Vytvořit účet"}
      </Button>
    </form>
  );
}