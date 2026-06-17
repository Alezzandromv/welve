import api from "./api";
import type { IUsuarioAdmin, RolUsuario } from "@/types/usuarios";

export const usuariosService = {
  async obtenerUsuarios(filtros?: { rol?: RolUsuario; esta_activo?: boolean }): Promise<IUsuarioAdmin[]> {
    const { data } = await api.get<IUsuarioAdmin[]>("/api/v1/admin/usuarios", { params: filtros });
    return data;
  },

  async obtenerUsuario(id: string): Promise<IUsuarioAdmin> {
    const { data } = await api.get<IUsuarioAdmin>(`/api/v1/admin/usuarios/${id}`);
    return data;
  },

  async actualizarUsuario(
    id: string,
    datos: { nombre_completo?: string; telefono?: string; esta_activo?: boolean },
  ): Promise<IUsuarioAdmin> {
    const { data } = await api.patch<IUsuarioAdmin>(`/api/v1/admin/usuarios/${id}`, datos);
    return data;
  },

  async actualizarCorreo(id: string, correo: string): Promise<IUsuarioAdmin> {
    const { data } = await api.patch<IUsuarioAdmin>(`/api/v1/admin/usuarios/${id}/correo`, { correo });
    return data;
  },

  async resetearPassword(id: string, password_nueva: string): Promise<void> {
    await api.patch(`/api/v1/admin/usuarios/${id}/password`, { password_nueva });
  },

  async cambiarEstado(id: string, esta_activo: boolean): Promise<IUsuarioAdmin> {
    const { data } = await api.patch<IUsuarioAdmin>(`/api/v1/admin/usuarios/${id}/estado`, { esta_activo });
    return data;
  },

  async crearUsuario(datos: {
    nombre_completo: string;
    rol: RolUsuario;
    correo?: string;
    telefono?: string;
    password?: string;
  }): Promise<IUsuarioAdmin> {
    const { data } = await api.post<IUsuarioAdmin>('/api/v1/admin/usuarios', datos);
    return data;
  },
};
