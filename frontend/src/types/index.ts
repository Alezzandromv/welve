export type Rol = "admin" | "trabajador" | "cliente";

export interface IUsuario {
  id: string;
  nombreCompleto: string;
  telefono: string;
  correo: string | null;
  rol: Rol;
  fotoPerfil: string | null;
  aceptaWhatsapp: boolean;
}

export interface ICita {
  id: string;
  clienteId: string;
  personalId: string;
  programadaEn: string; // ISO datetime aware Lima
  terminaEn: string;
  estado: EstadoCita;
  notasCliente: string | null;
  notasEspecialista: string | null;
  penalizacionAplicada: boolean;
}

export type EstadoCita =
  | "pendiente"
  | "confirmada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "cancelada_tardia"
  | "no_show";

export interface IServicio {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcionTecnica: string | null;
  duracionMinutos: number;
  precio: number;
  montoDeposito: number;
  requiereFichaSalud: boolean;
  horasCancelacionSinPenalidad: number;
  imagenReferenciaUrl: string | null;
}

export interface ICategoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  iconoUrl: string | null;
  colorHex: string;
  ordenVisualizacion: number;
}

export interface IFichaSalud {
  id: string;
  tipoRestriccion: string;
  descripcion: string;
  severidad: "informativa" | "moderada" | "critica";
  estaActivo: boolean;
}

export interface IPago {
  id: string;
  citaId: string;
  clienteId: string;
  tipo: "deposito" | "saldo" | "total" | "penalizacion" | "reembolso";
  metodo: "efectivo" | "transferencia" | "yape" | "plin" | "tarjeta";
  estado: "pendiente" | "confirmado" | "rechazado" | "reembolsado";
  monto: number;
  referenciaExterna: string | null;
  confirmadoPor: string | null;
  fechaConfirmacion: string | null;
}
