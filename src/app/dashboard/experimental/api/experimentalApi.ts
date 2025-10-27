// experimentalApi.ts
// Central axios instance and API helpers for the experimental users module.

import axios from "axios";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:3001";

export const api = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

// Attach token if present (non-blocking and tolerant to localStorage errors)
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
    // intentionally ignore localStorage read errors
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

export async function fetchExperimentalUsers(limit: number, offset: number) {
  const res = await api.get(
    `/users/experimental?limit=${limit}&offset=${offset}`
  );
  return res.data as BackendUser[];
}

export async function deleteUserByEmail(email: string) {
  const res = await api.delete("/users", { data: { email } });
  return res;
}
