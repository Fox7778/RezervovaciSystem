# Rezervo — nastavení projektu

Moderní rezervační systém učeben a vybavení.
**Frontend:** React 19 + TanStack Start (Vite) + TailwindCSS v4
**Backend:** Tvoje vlastní Supabase instance (Postgres + Auth)

> Pozn.: Zadání žádalo Nuxt v4. Lovable Nuxt nepodporuje, takže projekt
> používá ekvivalentní React stack. Veškerá komunikace s DB ale probíhá
> přímo přes oficiální `@supabase/supabase-js` klient, jak zadání vyžaduje.

## 1. `.env` soubor

Vytvoř v rootu projektu soubor `.env` (viz `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-public-key
```

Najdeš je v Supabase: **Project Settings → API → Project URL / anon public**.

## 2. SQL — vytvoření tabulek, rolí, triggerů a RLS

Otevři **SQL Editor** ve své Supabase a spusť ve dvou krocích (po sobě):

### 2a) Schéma + trigger pro automatické založení profilu

```sql
-- ROLE ENUM ------------------------------------------------------------
create type public.app_role as enum ('student', 'admin');

-- PROFILES -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

-- RESOURCES ------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  description text,
  location text,
  quantity int not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now()
);

-- RESERVATIONS ---------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  purpose text not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.reservations (resource_id, start_time, end_time);

-- Trigger: při registraci automaticky vytvoř profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper funkce pro kontrolu role (bez rekurze v RLS)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;
```

### 2b) GRANTy + Row Level Security

```sql
-- GRANTy (Supabase Data API)
grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select, insert, update, delete on public.resources to authenticated;
grant select on public.resources to anon;
grant select, insert, update, delete on public.reservations to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.reservations enable row level security;

-- PROFILES policies
create policy "profiles_select_all_authenticated"
  on public.profiles for select to authenticated using (true);
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- RESOURCES policies
create policy "resources_select_anyone_signedin"
  on public.resources for select to authenticated using (true);
create policy "resources_admin_write"
  on public.resources for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- RESERVATIONS policies
create policy "reservations_select_own_or_admin"
  on public.reservations for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reservations_insert_self"
  on public.reservations for insert to authenticated
  with check (user_id = auth.uid());
create policy "reservations_update_own_or_admin"
  on public.reservations for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reservations_delete_own_or_admin"
  on public.reservations for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
```

## 3. Povýšení účtu na správce

Po registraci prvního účtu z UI spusť v **SQL Editoru**:

```sql
update public.profiles
set role = 'admin'
where email = 'tvuj@email.cz';
```

## 4. Nastavení Supabase Auth

- **Authentication → Providers → Email**: zapnuto.
- Pro vývoj doporučuji v **Authentication → Email**: vypnout *"Confirm email"*,
  aby se účty daly hned přihlásit. Na produkci nech zapnuté.

## 5. Spuštění

```bash
bun install      # nebo npm install
bun run dev      # spustí Vite dev server
```

## 6. Použité Supabase API volání

Vše skrz `supabase-js` v `src/lib/supabase.ts`:

| Akce | Volání |
| --- | --- |
| Registrace | `supabase.auth.signUp({ email, password, options: { data: { display_name } } })` |
| Přihlášení | `supabase.auth.signInWithPassword({ email, password })` |
| Odhlášení | `supabase.auth.signOut()` |
| Načtení zdrojů | `supabase.from('resources').select('*').order(...)` |
| Nový zdroj | `supabase.from('resources').insert(payload)` |
| Úprava zdroje | `supabase.from('resources').update(payload).eq('id', id)` |
| Smazání zdroje | `supabase.from('resources').delete().eq('id', id)` |
| Kolizní kontrola | `supabase.from('reservations').select('id').eq('resource_id', X).lt('start_time', end).gt('end_time', start)` (při editaci doplnit `.neq('id', editId)`) |
| Nová rezervace | `supabase.from('reservations').insert({ resource_id, user_id, start_time, end_time, purpose })` |
| Úprava rezervace | `supabase.from('reservations').update({ ... }).eq('id', id)` |
| Smazání rezervace | `supabase.from('reservations').delete().eq('id', id)` |
| Dashboard (všichni) | `supabase.from('reservations').select('*, resource:resources(*), profile:profiles(*)')` |
| Vyčištění expirovaných | `supabase.from('reservations').delete().lt('end_time', now)` |

> **Status rezervace** (budoucí / aktivní / ukončená) se v UI počítá z `start_time` a `end_time` vůči aktuálnímu času — sloupec `status` v DB zůstává jako rezerva pro budoucí rozšíření.

### Migrace pro starší instance (přidání `purpose`)

Pokud už máš starší verzi schématu bez sloupce `purpose`, spusť:

```sql
alter table public.reservations
  add column if not exists purpose text not null default '';
alter table public.reservations alter column purpose drop default;
alter table public.reservations drop constraint if exists reservations_status_check;
```

## 7. Struktura projektu

```
src/
  lib/
    supabase.ts          # Supabase klient + typy
    auth.tsx             # AuthProvider (session + profil)
  components/
    AppShell.tsx         # navigace + layout
    ReserveDialog.tsx    # dialog pro vytvoření rezervace (vč. kolizí)
  routes/
    index.tsx                       # /  — landing
    auth.tsx                        # /auth — přihlášení / registrace
    _authenticated.tsx              # gate pro přihlášené
    _authenticated/
      resources.tsx                 # /resources — CRUD + filtr + rezervace
      reservations.tsx              # /reservations — moje rezervace
      admin.tsx                     # /admin — správa všech rezervací
```