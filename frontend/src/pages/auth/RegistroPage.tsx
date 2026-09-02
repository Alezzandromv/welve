import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { IUsuarioPerfil } from "@/types/auth";

const schema = z.object({
  nombre_completo: z.string().min(2, "Ingresa tu nombre completo"),
  correo: z.string().email("Ingresa un correo válido"),
  contrasena: z.string().min(8, "Mínimo 8 caracteres"),
  rol: z.enum(["admin", "trabajador"], { error: "Selecciona un rol" }),
});

type FormValues = z.infer<typeof schema>;

const easeOutExpo = [0.16, 1, 0.3, 1] as const;
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fieldCls(hasError: boolean, focused: boolean): string {
  return `w-full py-2 px-3 text-sm bg-surface-base rounded-lg text-ink-strong outline-none transition-[border-color] duration-150 border ${
    hasError ? "border-error" : focused ? "border-accent" : "border-border-base"
  }`;
}

export default function RegistroPage() {
  const navigate = useNavigate();
  const { setAuth, estaAutenticado } = useAuthStore();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Los hooks deben llamarse siempre en el mismo orden — el return condicional va
  // después de todos los hooks, nunca antes (react-hooks/rules-of-hooks).
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const regNombre = register("nombre_completo");
  const regCorreo = register("correo");
  const regContrasena = register("contrasena");
  const regRol = register("rol");

  if (estaAutenticado()) {
    navigate("/", { replace: true });
    return null;
  }

  async function onSubmit(data: FormValues) {
    setErrorGeneral(null);
    try {
      const resultado = await authService.registrar({
        nombre_completo: data.nombre_completo,
        correo: data.correo,
        contrasena: data.contrasena,
        rol: data.rol,
      });

      const usuarioParcial: IUsuarioPerfil = {
        id: resultado.usuario_id,
        nombre_completo: resultado.nombre_completo,
        telefono: null,
        correo: data.correo,
        rol: resultado.rol,
        foto_perfil_url: null,
        acepta_whatsapp: true,
        fecha_creacion: null,
        ultimo_acceso: null,
      };
      setAuth(resultado.access_token, usuarioParcial);

      if (resultado.rol === "admin") navigate("/admin");
      else navigate("/trabajador/agenda");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setErrorGeneral("El correo ya está registrado.");
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setErrorGeneral("Rol no permitido.");
      } else {
        setErrorGeneral("Error al crear la cuenta. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden md:flex flex-col justify-between w-[45%] bg-surface-sidebar p-10">
        <span className="text-xs font-medium tracking-[0.06em] text-sidebar-ink-muted uppercase">
          Welve
        </span>

        <div>
          <h1 className="m-0 text-5xl font-semibold tracking-tight leading-[1.1] text-sidebar-ink-strong">
            Eunoia
          </h1>
          <p className="mt-3 text-base text-sidebar-ink-muted">
            Beauty Salon · Lima
          </p>
          <div className="mt-8 w-8 h-[2px] bg-accent rounded-[1px]" />
          <p className="mt-6 text-sm text-sidebar-ink-muted max-w-[28ch] leading-relaxed">
            Crea tu cuenta de acceso al sistema de gestión.
          </p>
        </div>

        <div className="text-xs text-sidebar-ink-muted">
          © {new Date().getFullYear()} Eunoia Beauty Salon
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-surface-bg">
        <div className="md:hidden mb-8 text-center">
          <p className="text-xs text-ink-muted font-medium">
            Welve · Eunoia Beauty Salon
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOutExpo }}
          className="w-full max-w-[22rem]"
        >
          <div className="bg-surface-base rounded-xl shadow p-8">
            <h2 className="m-0 text-2xl font-semibold tracking-tight text-ink-strong">
              Crear cuenta
            </h2>
            <p className="mt-1.5 mb-7 text-sm text-ink-muted">
              Solo para personal autorizado
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Nombre */}
              <div className="mb-4">
                <label htmlFor="nombre_completo" className="block mb-1.5 text-sm font-medium text-ink-strong">
                  Nombre completo
                </label>
                <input
                  id="nombre_completo"
                  type="text"
                  autoComplete="name"
                  placeholder="Ana García"
                  {...regNombre}
                  onFocus={() => setFocused("nombre_completo")}
                  onBlur={(e) => { setFocused(null); void regNombre.onBlur(e); }}
                  className={fieldCls(!!errors.nombre_completo, focused === "nombre_completo")}
                />
                {errors.nombre_completo && (
                  <p role="alert" className="mt-1 text-xs text-error-dark">{errors.nombre_completo.message}</p>
                )}
              </div>

              {/* Correo */}
              <div className="mb-4">
                <label htmlFor="correo" className="block mb-1.5 text-sm font-medium text-ink-strong">
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="hola@eunoia.pe"
                  {...regCorreo}
                  onFocus={() => setFocused("correo")}
                  onBlur={(e) => { setFocused(null); void regCorreo.onBlur(e); }}
                  className={fieldCls(!!errors.correo, focused === "correo")}
                />
                {errors.correo && (
                  <p role="alert" className="mt-1 text-xs text-error-dark">{errors.correo.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="mb-4">
                <label htmlFor="contrasena" className="block mb-1.5 text-sm font-medium text-ink-strong">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...regContrasena}
                    onFocus={() => setFocused("contrasena")}
                    onBlur={(e) => { setFocused(null); void regContrasena.onBlur(e); }}
                    className={`${fieldCls(!!errors.contrasena, focused === "contrasena")} pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setMostrarContrasena((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 text-ink-muted flex items-center"
                  >
                    {mostrarContrasena ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.contrasena && (
                  <p role="alert" className="mt-1 text-xs text-error-dark">{errors.contrasena.message}</p>
                )}
              </div>

              {/* Rol */}
              <div className="mb-6">
                <label htmlFor="rol" className="block mb-1.5 text-sm font-medium text-ink-strong">
                  Rol
                </label>
                <select
                  id="rol"
                  {...regRol}
                  onFocus={() => setFocused("rol")}
                  onBlur={(e) => { setFocused(null); void regRol.onBlur(e); }}
                  className={`${fieldCls(!!errors.rol, focused === "rol")} appearance-none cursor-pointer`}
                >
                  <option value="">Selecciona un rol</option>
                  <option value="admin">Administrador</option>
                  <option value="trabajador">Especialista</option>
                </select>
                {errors.rol && (
                  <p role="alert" className="mt-1 text-xs text-error-dark">{errors.rol.message}</p>
                )}
              </div>

              {/* Error general */}
              {errorGeneral && (
                <div
                  role="alert"
                  className="mb-4 py-2.5 px-3 bg-error-light rounded-lg text-sm text-error-dark"
                >
                  {errorGeneral}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                className={`w-full py-2.5 px-4 text-sm font-medium text-accent-foreground border-none rounded-lg transition-[background] duration-150 ${
                  isSubmitting
                    ? "bg-accent-hover cursor-not-allowed"
                    : "bg-accent cursor-pointer hover:bg-accent-hover"
                }`}
              >
                {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
              </motion.button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-ink-muted">
            ¿Ya tienes acceso?{" "}
            <Link to="/login" className="text-accent font-medium no-underline">
              Iniciar sesión
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
