import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

// En dev el proxy de Vite reenvía /api → localhost:8000, evitando CORS en Codespaces.
// En prod se usa VITE_API_URL (URL pública del backend).
const api = axios.create({
  baseURL: import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? ""),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().cerrarSesion();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
