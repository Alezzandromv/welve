import api from "./api";
import type { IPago, IPagoCreate, IConfirmarPago } from "@/types/pagos";

export const pagosService = {
  async obtenerPagosPendientes(): Promise<IPago[]> {
    const { data } = await api.get<IPago[]>("/api/v1/admin/pagos/pendientes");
    return data;
  },

  async obtenerPorCita(citaId: string): Promise<IPago[]> {
    const { data } = await api.get<IPago[]>(`/api/v1/admin/citas/${citaId}/pagos`);
    return data;
  },

  async crear(datos: IPagoCreate): Promise<IPago> {
    const { data } = await api.post<IPago>("/api/v1/admin/pagos", datos);
    return data;
  },

  async confirmar(id: string, datos: IConfirmarPago): Promise<IPago> {
    const { data } = await api.patch<IPago>(`/api/v1/admin/pagos/${id}/confirmar`, datos);
    return data;
  },

  async rechazar(id: string, datos: IConfirmarPago): Promise<IPago> {
    const { data } = await api.patch<IPago>(`/api/v1/admin/pagos/${id}/rechazar`, datos);
    return data;
  },

  async reembolsar(id: string, datos: IConfirmarPago): Promise<IPago> {
    const { data } = await api.patch<IPago>(`/api/v1/admin/pagos/${id}/reembolsar`, datos);
    return data;
  },
};
