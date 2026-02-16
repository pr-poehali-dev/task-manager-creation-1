import funcUrls from "../../backend/func2url.json";

const AUTH_API = funcUrls["auth-api"];
const TOKEN_KEY = "auth-token";

export interface User {
  id: string;
  email: string;
  name: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(AUTH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка входа");
  setToken(data.token);
  return data;
}

export async function register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
  const res = await fetch(AUTH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "register", email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
  setToken(data.token);
  return data;
}

export async function checkAuth(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${AUTH_API}?action=me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearToken();
    return null;
  }
  return res.json();
}
