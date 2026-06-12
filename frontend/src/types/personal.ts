export interface IPersonal {
  id: string;
  usuario_id: string;
  especialidad: string;
  biografia: string | null;
  color_agenda: string;
  comision_porcentaje: number;
  tipo_contrato: string;
  fecha_ingreso: string | null;
  esta_activo: boolean;
  nombre_completo: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface IPersonalCreate {
  usuario_id: string;
  especialidad: string;
  biografia?: string;
  color_agenda?: string;
  comision_porcentaje?: number;
  tipo_contrato?: string;
  fecha_ingreso?: string;
}

export interface IPersonalUpdate {
  especialidad?: string;
  biografia?: string;
  color_agenda?: string;
  comision_porcentaje?: number;
  tipo_contrato?: string;
  esta_activo?: boolean;
  nombre_completo?: string;
  telefono?: string | null;
}

export interface IDisponibilidad {
  id: string;
  personal_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  minutos_buffer: number;
  esta_activo: boolean;
}

export interface IDisponibilidadCreate {
  personal_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  minutos_buffer?: number;
}

export interface IDisponibilidadUpdate {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  minutos_buffer?: number;
}

export interface IPersonalCrearCompleto {
  nombre_completo: string;
  correo: string;
  contrasena: string;
  especialidad: string;
  color_agenda: string;
  comision_porcentaje: number;
  tipo_contrato: string;
}
