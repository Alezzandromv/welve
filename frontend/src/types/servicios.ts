export interface ICategoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  icono_url: string | null;
  color_hex: string;
  orden_visualizacion: number;
  esta_activo: boolean;
}

export interface ICategoriaCreate {
  nombre: string;
  descripcion?: string;
  icono_url?: string;
  color_hex?: string;
  orden_visualizacion?: number;
}

export interface ICategoriaUpdate {
  nombre?: string;
  descripcion?: string;
  orden_visualizacion?: number;
  esta_activo?: boolean;
}

export interface IServicio {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion_tecnica: string | null;
  duracion_minutos: number;
  precio: number;
  monto_deposito: number;
  requiere_ficha_salud: boolean;
  horas_cancelacion_sin_penalidad: number;
  imagen_referencia_url: string | null;
  esta_activo: boolean;
}

export interface IServicioCreate {
  categoria_id: string;
  nombre: string;
  descripcion_tecnica?: string;
  duracion_minutos: number;
  precio: number;
  monto_deposito: number;
  requiere_ficha_salud?: boolean;
  horas_cancelacion_sin_penalidad?: number;
  imagen_referencia_url?: string;
}

export interface IServicioUpdate {
  nombre?: string;
  descripcion_tecnica?: string;
  duracion_minutos?: number;
  precio?: number;
  monto_deposito?: number;
  requiere_ficha_salud?: boolean;
  horas_cancelacion_sin_penalidad?: number;
  imagen_referencia_url?: string;
  esta_activo?: boolean;
}

export interface IHorarioDisponible {
  inicio: string;
  fin: string;
}

export interface ISlotDisponible {
  personal_id: string;
  horarios: IHorarioDisponible[];
}
