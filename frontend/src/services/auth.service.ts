import api from "./api";
import type {
  IActualizarPerfil,
  ICambiarPassword,
  ILoginRequest,
  IRegistroRequest,
  ITokenResponse,
  IUsuarioPerfil,
} from "@/types/auth";

export const authService = {
  async solicitarAcceso(telefono: string): Promise<{ mensaje: string }> {
    const { data } = await api.post("/api/v1/auth/solicitar-acceso", { telefono });
    return data;
  },

  async verificarToken(token: string): Promise<{ access_token: string; rol: string; nombre: string }> {
    const { data } = await api.get("/api/v1/auth/verificar", { params: { token } });
    return data;
  },

  async login(body: ILoginRequest): Promise<ITokenResponse> {
    const { data } = await api.post("/api/v1/auth/login", body);
    return data;
  },

  async registrar(body: IRegistroRequest): Promise<ITokenResponse> {
    const { data } = await api.post("/api/v1/auth/registrar", body);
    return data;
  },

  async obtenerPerfil(): Promise<IUsuarioPerfil> {
    const { data } = await api.get("/api/v1/auth/perfil");
    return data;
  },

  async actualizarPerfil(body: IActualizarPerfil): Promise<IUsuarioPerfil> {
    const { data } = await api.patch<IUsuarioPerfil>("/api/v1/auth/perfil", body);
    return data;
  },

  async cambiarPassword(body: ICambiarPassword): Promise<{ mensaje: string }> {
    const { data } = await api.post<{ mensaje: string }>("/api/v1/auth/cambiar-password", body);
    return data;
  },
};
