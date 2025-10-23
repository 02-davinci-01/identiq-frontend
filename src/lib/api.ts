// lib/api.ts
import axios, { AxiosInstance } from "axios";

const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL as string) || "https://localhost:3001";

export const api: AxiosInstance = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10_000,
  validateStatus: (s) => s >= 200 && s < 500,
});

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    null
  );
}
