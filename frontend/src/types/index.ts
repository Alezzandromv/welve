export type Rol = "admin" | "trabajador" | "cliente";

export interface IUsuario {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  rol: Rol;
  foto_perfil_url: string | null;
  acepta_whatsapp: boolean;
}

export type { EstadoCita, ICita, ICitaCreate, ICitaServicio, ICancelarCita, ICambiarEstado, IFiltrosCitas } from "./citas";
export type { ICategoria, ICategoriaCreate, IServicio, IServicioCreate, IServicioUpdate, ISlotDisponible, IHorarioDisponible } from "./servicios";
export type { ICliente, IClienteUpdate, IFichaSalud, IFichaSaludCreate, SeveridadFicha } from "./clientes";
export type { IPersonal, IPersonalCreate, IPersonalUpdate, IDisponibilidad, IDisponibilidadCreate, IDisponibilidadUpdate } from "./personal";
export type { IPago, IPagoCreate, IConfirmarPago, IFiltrosPagos, TipoPago, MetodoPago, EstadoPago } from "./pagos";
export type { IReto, IRetoCreate, IRetoProgreso, IDescuento, IDescuentoCreate, IDescuentoUso, RecompensaTipo, TipoDescuento, ScopeDescuento } from "./fidelizacion";
