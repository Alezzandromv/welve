import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function VerificarTokenPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    authService
      .verificarToken(token)
      .then(async (resp) => {
        // Persiste el token primero para que api.ts lo incluya en el siguiente request
        const perfil = await authService.obtenerPerfil();
        setAuth(resp.access_token, perfil);
        navigate("/");
      })
      .catch(() => navigate("/login"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Verificando acceso...</p>
    </div>
  );
}
