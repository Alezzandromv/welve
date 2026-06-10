import api from "./api";
import type { ILoginRequest, IRegistroRequest, ITokenResponse, IUsuarioPerfil } from "@/types/auth";

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
};
