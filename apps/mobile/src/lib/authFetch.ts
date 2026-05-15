import { useAuthStore } from "../store/authStore";

export function authHeaders(): HeadersInit {
  const t = useAuthStore.getState().token;
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

/** Merge Authorization when a token exists (catalog, assistant, etc.). */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);
  const t = useAuthStore.getState().token;
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(input, { ...init, headers });
}
