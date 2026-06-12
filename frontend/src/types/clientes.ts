export type SeveridadFicha = "informativa" | "moderada" | "critica";

export interface IFichaSalud {
  id: string;
  tipo_restriccion: string;
  descripcion: string;
  severidad: SeveridadFicha;
  esta_activo: boolean;
}

export interface IFichaSaludCreate {
  tipo_restriccion: string;
  descripcion: string;
  severidad?: SeveridadFicha;
}

export interface ICliente {
  id: string;
  usuario_id: string;
  fecha_nacimiento: string | null;
  canal_captacion: string | null;
  etiquetas: string[];
  notas_internas: string | null;
  esta_bloqueada: boolean;
  motivo_bloqueo: string | null;
  nombre_completo: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface IClienteUpdate {
  fecha_nacimiento?: string;
  canal_captacion?: string;
  etiquetas?: string[];
  notas_internas?: string;
  nombre_completo?: string;
  telefono?: string | null;
}
