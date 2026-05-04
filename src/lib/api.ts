import { supabase } from "./supabase";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export async function inviteUser(
  email: string,
  role: "admin" | "manager" | "viewer",
) {
  // redirectTo tells the backend to forward this value to Supabase's
  // admin.inviteUserByEmail({ redirectTo }) so the invite email lands
  // the user on our /welcome page instead of the default Supabase page.
  const redirectTo = `${window.location.origin}/welcome`;
  return authedFetch("/admin/invite", {
    method: "POST",
    body: JSON.stringify({ email, role, redirectTo }),
  });
}
