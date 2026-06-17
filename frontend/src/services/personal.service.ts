import api from "./api";
import type {
  IPersonal,
  IPersonalCreate,
  IPersonalUpdate,
  IPersonalCrearCompleto,
  IDisponibilidad,
  IDisponibilidadCreate,
} from "@/types/personal";

export const personalService = {
  async obtenerPersonal(): Promise<IPersonal[]> {
    const { data } = await api.get<IPersonal[]>("/api/v1/admin/personal");
    return data;
  },

  async obtenerMiembro(id: string): Promise<IPersonal> {
    const personal = await this.obtenerPersonal();
    const miembro = personal.find((p) => p.id === id);
    if (!miembro) throw new Error(`Personal ${id} no encontrado`);
    return miembro;
  },

  async crear(datos: IPersonalCreate): Promise<IPersonal> {
    const { data } = await api.post<IPersonal>("/api/v1/admin/personal", datos);
    return data;
  },

  async actualizar(id: string, datos: IPersonalUpdate): Promise<IPersonal> {
    const { data } = await api.patch<IPersonal>(`/api/v1/admin/personal/${id}`, datos);
    return data;
  },

  async obtenerDisponibilidad(personalId: string): Promise<IDisponibilidad[]> {
    const { data } = await api.get<IDisponibilidad[]>(
      `/api/v1/admin/personal/${personalId}/disponibilidad`,
    );
    return data;
  },

  async agregarDisponibilidad(
    personalId: string,
    datos: IDisponibilidadCreate,
  ): Promise<IDisponibilidad> {
    const { data } = await api.post<IDisponibilidad>(
      `/api/v1/admin/personal/${personalId}/disponibilidad`,
      datos,
    );
    return data;
  },

  async eliminarDisponibilidad(personalId: string, dispId: string): Promise<void> {
    await api.delete(`/api/v1/admin/personal/${personalId}/disponibilidad/${dispId}`);
  },

  async crearCompleto(datos: IPersonalCrearCompleto): Promise<IPersonal> {
    const { data: nuevoUsuario } = await api.post<{ id: string }>(
      "/api/v1/admin/usuarios",
      {
        nombre_completo: datos.nombre_completo,
        correo: datos.correo,
        password: datos.contrasena,
        rol: "trabajador",
      }
    );
    const { data } = await api.post<IPersonal>("/api/v1/admin/personal", {
      usuario_id: nuevoUsuario.id,
      especialidad: datos.especialidad,
      color_agenda: datos.color_agenda,
      comision_porcentaje: datos.comision_porcentaje,
      tipo_contrato: datos.tipo_contrato,
    });
    return data;
  },

  async guardarHorarios(
    personalId: string,
    horarios: IDisponibilidadCreate[]
  ): Promise<void> {
    const existentes = await this.obtenerDisponibilidad(personalId);
    await Promise.all(
      existentes.map((d) => this.eliminarDisponibilidad(personalId, d.id))
    );
    await Promise.all(horarios.map((h) => this.agregarDisponibilidad(personalId, h)));
  },

  async toggleActivo(id: string, activo: boolean): Promise<IPersonal> {
    return this.actualizar(id, { esta_activo: activo } as IPersonalUpdate);
  },
};
