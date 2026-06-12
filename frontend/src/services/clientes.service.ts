import api from "./api";
import type { ICliente, IClienteUpdate, IFichaSalud, IFichaSaludCreate } from "@/types/clientes";
import type { ICita } from "@/types/citas";

export const clientesService = {
  async obtenerClientes(): Promise<ICliente[]> {
    const { data } = await api.get<ICliente[]>("/api/v1/clientes");
    return data;
  },

  async obtenerCliente(id: string): Promise<ICliente> {
    const { data } = await api.get<ICliente>(`/api/v1/clientes/${id}`);
    return data;
  },

  async actualizar(id: string, datos: IClienteUpdate): Promise<ICliente> {
    const { data } = await api.patch<ICliente>(`/api/v1/clientes/${id}`, datos);
    return data;
  },

  async obtenerHistorial(id: string): Promise<ICita[]> {
    const { data } = await api.get<ICita[]>(`/api/v1/clientes/${id}/historial`);
    return data;
  },

  async obtenerFichas(clienteId: string): Promise<IFichaSalud[]> {
    const { data } = await api.get<IFichaSalud[]>(`/api/v1/clientes/${clienteId}/fichas-salud`);
    return data;
  },

  async agregarFicha(clienteId: string, datos: IFichaSaludCreate): Promise<IFichaSalud> {
    const { data } = await api.post<IFichaSalud>(
      `/api/v1/clientes/${clienteId}/fichas-salud`,
      datos,
    );
    return data;
  },

  async bloquear(id: string, motivo_bloqueo: string): Promise<void> {
    await api.patch(`/api/v1/clientes/${id}/bloquear`, { motivo_bloqueo });
  },

  async desbloquear(id: string): Promise<void> {
    await api.patch(`/api/v1/clientes/${id}/desbloquear`);
  },
};
