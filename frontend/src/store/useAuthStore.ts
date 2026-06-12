import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Rol } from "@/types";
import type { IUsuarioPerfil } from "@/types/auth";
import { authService } from "@/services/auth.service";

interface AuthState {
  token: string | null;
  usuario: IUsuarioPerfil | null;
  rol: Rol | null;
  isAuthenticated: boolean;
  setAuth: (token: string, usuario: IUsuarioPerfil) => void;
  cerrarSesion: () => void;
  estaAutenticado: () => boolean;
  cargarPerfil: () => Promise<void>;
  actualizarUsuario: (datos: Partial<IUsuarioPerfil>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      rol: null,
      isAuthenticated: false,

      setAuth: (token, usuario) =>
        set({ token, usuario, rol: usuario.rol as Rol, isAuthenticated: true }),

      cerrarSesion: () =>
        set({ token: null, usuario: null, rol: null, isAuthenticated: false }),

      estaAutenticado: () => !!get().token,

      cargarPerfil: async () => {
        const perfil = await authService.obtenerPerfil();
        set({ usuario: perfil, rol: perfil.rol as Rol });
      },

      actualizarUsuario: (datos) =>
        set((s) => ({
          usuario: s.usuario ? { ...s.usuario, ...datos } : s.usuario,
        })),
    }),
    { name: "welve-auth" }
  )
);
