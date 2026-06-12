export interface ILoginRequest {
  correo: string;
  contrasena: string;
}

export interface IRegistroRequest {
  nombre_completo: string;
  correo: string;
  contrasena: string;
  rol: 'admin' | 'trabajador';
}

export interface ITokenResponse {
  access_token: string;
  token_type: string;
  rol: string;
  nombre_completo: string;
  usuario_id: string;
}

export interface IUsuarioPerfil {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  rol: string;
  foto_perfil_url: string | null;
  acepta_whatsapp: boolean;
  fecha_creacion: string | null;
  ultimo_acceso: string | null;
}

export interface IActualizarPerfil {
  nombre_completo?: string;
  correo?: string;
  telefono?: string;
}

export interface ICambiarPassword {
  password_actual: string;
  password_nueva: string;
}
