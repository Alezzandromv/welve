import api from "./api";
import type {
  ICita,
  ICitaCreate,
  ICitaAdminCreate,
  ICitaServicio,
  ICambiarEstado,
  ICancelarCita,
  IFiltrosCitas,
} from "@/types/citas";

export const citasService = {
  async crear(datos: ICitaCreate): Promise<ICita> {
    const { data } = await api.post<ICita>("/api/v1/citas", datos);
    return data;
  },

  async obtenerMisCitas(): Promise<ICita[]> {
    const { data } = await api.get<ICita[]>("/api/v1/citas/mis-citas");
    return data;
  },

  async cancelar(id: string, body?: ICancelarCita): Promise<ICita> {
    const { data } = await api.patch<ICita>(`/api/v1/citas/${id}/cancelar`, body ?? {});
    return data;
  },

  async cambiarEstado(id: string, body: ICambiarEstado): Promise<ICita> {
    const { data } = await api.patch<ICita>(`/api/v1/citas/${id}/estado`, body);
    return data;
  },

  async registrarLlegada(id: string, hora_llegada_real: string): Promise<ICita> {
    const { data } = await api.patch<ICita>(`/api/v1/citas/${id}/llegada`, { hora_llegada_real });
    return data;
  },

  async obtenerServicios(citaId: string): Promise<ICitaServicio[]> {
    const { data } = await api.get<ICitaServicio[]>(`/api/v1/citas/${citaId}/servicios`);
    return data;
  },

  async obtenerCitasAdmin(params?: IFiltrosCitas): Promise<ICita[]> {
    const { data } = await api.get<ICita[]>("/api/v1/admin/citas", { params });
    return data;
  },

  async crearCitaAdmin(datos: ICitaAdminCreate): Promise<ICita> {
    const { data } = await api.post<ICita>("/api/v1/admin/citas", datos);
    return data;
  },

  async obtenerCitasTrabajador(fecha?: string): Promise<ICita[]> {
    const { data } = await api.get<ICita[]>("/api/v1/trabajador/agenda", {
      params: fecha ? { fecha } : undefined,
    });
    return data;
  },
};
