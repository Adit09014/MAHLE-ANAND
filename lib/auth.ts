import { AuthSession, AuthUser } from "./types";

export async function getAuthSession(): Promise<AuthSession> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    /* session fetch failed */
  }
  return { authenticated: false };
}

export async function loginUser(payload: {
  role: string;
  name?: string;
  code?: string;
  unitId?: string;
  judgeId?: string;
  password?: string;
}): Promise<{ ok: boolean; error?: string; user?: AuthUser }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Login failed" };
    }
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: "Network error during login." };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    /* logout failed */
  }
}
