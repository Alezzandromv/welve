import api from "./api";
import type {
  ICategoria,
  ICategoriaCreate,
  ICategoriaUpdate,
  IServicio,
  IServicioCreate,
  IServicioUpdate,
  ISlotDisponible,
} from "@/types/servicios";

export const serviciosService = {
  async obtenerCategorias(): Promise<ICategoria[]> {
    const { data } = await api.get<ICategoria[]>("/api/v1/servicios/categorias");
    return data;
  },

  async actualizarCategoria(id: string, datos: ICategoriaUpdate): Promise<ICategoria> {
    const { data } = await api.patch<ICategoria>(`/api/v1/servicios/categorias/${id}`, datos);
    return data;
  },

  async obtenerServicios(params?: { categoria_id?: string; incluir_inactivos?: boolean }): Promise<IServicio[]> {
    const { data } = await api.get<IServicio[]>("/api/v1/servicios", { params });
    return data;
  },

  async obtenerServicio(id: string): Promise<IServicio> {
    const servicios = await this.obtenerServicios({ incluir_inactivos: true });
    const servicio = servicios.find((s) => s.id === id);
    if (!servicio) throw new Error(`Servicio ${id} no encontrado`);
    return servicio;
  },

  async crearCategoria(datos: ICategoriaCreate): Promise<ICategoria> {
    const { data } = await api.post<ICategoria>("/api/v1/servicios/categorias", datos);
    return data;
  },

  async crearServicio(datos: IServicioCreate): Promise<IServicio> {
    const { data } = await api.post<IServicio>("/api/v1/servicios", datos);
    return data;
  },

  async actualizarServicio(id: string, datos: IServicioUpdate): Promise<IServicio> {
    const { data } = await api.patch<IServicio>(`/api/v1/servicios/${id}`, datos);
    return data;
  },

  async eliminarServicio(id: string): Promise<void> {
    await api.patch(`/api/v1/servicios/${id}`, { esta_activo: false });
  },

  async obtenerDisponibilidad(id: string, fecha: string): Promise<ISlotDisponible[]> {
    const { data } = await api.get<ISlotDisponible[]>(
      `/api/v1/servicios/${id}/disponibilidad`,
      { params: { fecha } },
    );
    return data;
  },
};
