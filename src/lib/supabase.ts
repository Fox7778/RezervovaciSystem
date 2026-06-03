import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY chybí. Vytvoř .env podle .env.example.",
  );
}

export const supabase = createClient(url ?? "http://localhost", anon ?? "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "student" | "admin";
  created_at: string;
};

export type Resource = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string | null;
  quantity: number;
  created_at: string;
};

export type Reservation = {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  resource?: Resource;
  profile?: Profile;
};