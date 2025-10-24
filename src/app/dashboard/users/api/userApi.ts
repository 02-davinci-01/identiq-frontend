// src/app/dashboard/users/api/usersApi.ts
// Central axios instance and small API wrappers for users page.

import axios from "axios";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:3001";

export const api = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

// Non-blocking token attach (best-effort)
api.interceptors.request.use((config) => {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token") ??
          localStorage.getItem("accessToken") ??
          localStorage.getItem("token") ??
          localStorage.getItem("jwt") ??
          null
        : null;
    config.headers = config.headers ?? {};
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    else delete config.headers["Authorization"];
  } catch {
    // ignore localStorage errors
  }
  return config;
});

export type BackendUser = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  colorHex?: string;
};

export async function fetchUsers(limit: number, offset: number) {
  const res = await api.get("/users", { params: { limit, offset } });
  return res;
}

export async function deleteUserByEmail(email: string) {
  const res = await api.delete("/users", { data: { email } });
  return res;
}
