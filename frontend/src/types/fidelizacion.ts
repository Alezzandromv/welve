export type RecompensaTipo = "descuento" | "servicio_gratis" | "credito";
export type TipoDescuento = "porcentaje" | "monto_fijo";
export type ScopeDescuento = "publico" | "privado" | "reto";

export interface IReto {
  id: string;
  nombre: string;
  descripcion_visible: string;
  visitas_requeridas: number;
  dias_ventana: number;
  recompensa_tipo: RecompensaTipo;
  recompensa_valor: number;
  esta_activo: boolean;
  vigente_hasta: string | null;
}

export interface IRetoCreate {
  nombre: string;
  descripcion_visible: string;
  visitas_requeridas: number;
  dias_ventana: number;
  recompensa_tipo: RecompensaTipo;
  recompensa_valor: number;
  vigente_hasta?: string;
}

export interface IRetoProgreso {
  reto: IReto;
  visitas: number;
  completado: boolean;
  en_ventana: boolean;
}

export interface IDescuento {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoDescuento;
  scope: ScopeDescuento;
  codigo: string | null;
  valor: number;
  monto_minimo: number;
  max_usos_global: number | null;
  max_usos_por_cliente: number;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  esta_activo: boolean;
}

export interface IDescuentoCreate {
  nombre: string;
  descripcion?: string;
  tipo: TipoDescuento;
  scope?: ScopeDescuento;
  codigo?: string;
  valor: number;
  monto_minimo?: number;
  max_usos_global?: number;
  max_usos_por_cliente?: number;
  vigente_desde?: string;
  vigente_hasta?: string;
}

export interface IDescuentoUso {
  id: string;
  descuento_id: string;
  cliente_id: string;
  cita_id: string;
  reto_origen_id: string | null;
  fecha_canje: string;
}
