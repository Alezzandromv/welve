import api from "./api";
import type {
  IReto,
  IRetoCreate,
  IRetoProgreso,
  IDescuento,
  IDescuentoCreate,
  IDescuentoUso,
} from "@/types/fidelizacion";

export const fidelizacionService = {
  async obtenerMisRetos(): Promise<IRetoProgreso[]> {
    const { data } = await api.get<IRetoProgreso[]>("/api/v1/fidelizacion/mis-retos");
    return data;
  },

  async obtenerMisDescuentos(): Promise<IDescuento[]> {
    const { data } = await api.get<IDescuento[]>("/api/v1/fidelizacion/mis-descuentos");
    return data;
  },

  async aplicarDescuento(cita_id: string, codigo: string): Promise<IDescuentoUso> {
    const { data } = await api.post<IDescuentoUso>(
      "/api/v1/fidelizacion/aplicar-descuento",
      { codigo },
      { params: { cita_id } },
    );
    return data;
  },

  async obtenerRetos(): Promise<IReto[]> {
    const { data } = await api.get<IReto[]>("/api/v1/fidelizacion/retos");
    return data;
  },

  async crearReto(datos: IRetoCreate): Promise<IReto> {
    const { data } = await api.post<IReto>("/api/v1/fidelizacion/retos", datos);
    return data;
  },

  async obtenerDescuentos(): Promise<IDescuento[]> {
    const { data } = await api.get<IDescuento[]>("/api/v1/fidelizacion/descuentos");
    return data;
  },

  async crearDescuento(datos: IDescuentoCreate): Promise<IDescuento> {
    const { data } = await api.post<IDescuento>("/api/v1/fidelizacion/descuentos", datos);
    return data;
  },
};
