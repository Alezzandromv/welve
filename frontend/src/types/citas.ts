export type EstadoCita =
  | "pendiente"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "cancelada_tardia"
  | "no_show";

export interface ICita {
  id: string;
  cliente_id: string;
  personal_id: string;
  programada_en: string;
  termina_en: string;
  estado: EstadoCita;
  hora_llegada_real: string | null;
  notas_cliente: string | null;
  notas_especialista: string | null;
  motivo_cancelacion: string | null;
  fecha_cancelacion: string | null;
  penalizacion_aplicada: boolean;
  creada_en: string;
  nombre_cliente: string | null;
  nombre_especialista: string | null;
  nombre_servicio: string | null;
}

export interface ICitaServicio {
  id: string;
  servicio_id: string;
  precio_unitario: number;
  duracion_minutos: number;
}

export interface ICitaCreate {
  personal_id: string;
  servicio_ids: string[];
  programada_en: string;
  notas_cliente?: string;
}

export interface ICitaAdminCreate {
  cliente_id: string;
  personal_id: string;
  servicio_ids: string[];
  programada_en: string;
  notas_cliente?: string;
}

export interface ICancelarCita {
  motivo_cancelacion?: string;
}

export interface ICambiarEstado {
  estado: EstadoCita;
  notas_especialista?: string;
  confirmar_ficha_critica?: boolean;
}

export interface IFiltrosCitas {
  fecha?: string;
  estado?: EstadoCita;
}
