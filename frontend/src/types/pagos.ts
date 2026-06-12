export type TipoPago = "deposito" | "saldo" | "total" | "penalizacion" | "reembolso";
export type MetodoPago = "efectivo" | "transferencia" | "yape" | "plin" | "tarjeta";
export type EstadoPago = "pendiente" | "confirmado" | "rechazado" | "reembolsado";

export interface IPago {
  id: string;
  cita_id: string;
  cliente_id: string;
  tipo: TipoPago;
  metodo: MetodoPago;
  estado: EstadoPago;
  monto: number;
  referencia_externa: string | null;
  comprobante_url: string | null;
  confirmado_por: string | null;
  fecha_confirmacion: string | null;
  nota_admin: string | null;
}

export interface IPagoCreate {
  cita_id: string;
  tipo: TipoPago;
  metodo: MetodoPago;
  monto: number;
  referencia_externa?: string;
}

export interface IConfirmarPago {
  referencia_externa?: string;
  nota_admin?: string;
}

export interface IFiltrosPagos {
  cita_id?: string;
  estado?: EstadoPago;
}
