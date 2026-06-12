export type RolUsuario = 'admin' | 'trabajador' | 'cliente';

export interface IUsuarioAdmin {
  id: string;
  nombre_completo: string;
  correo: string | null;
  telefono: string | null;
  rol: RolUsuario;
  esta_activo: boolean;
  correo_verificado: boolean;
  fecha_creacion: string | null;
}
