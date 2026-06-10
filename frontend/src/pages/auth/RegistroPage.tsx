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
  rol: z.enum(["admin", "trabajador"], {
    errorMap: () => ({ message: "Selecciona un rol" }),
  }),
});

type FormValues = z.infer<typeof schema>;

const easeOutExpo = [0.16, 1, 0.3, 1] as const;
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RegistroPage() {
  const navigate = useNavigate();
  const { setAuth, estaAutenticado } = useAuthStore();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  if (estaAutenticado()) {
    navigate("/", { replace: true });
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    background: "var(--surface-base)",
    border: `1px solid ${hasError ? "var(--error)" : "var(--border-base)"}`,
    borderRadius: "var(--radius-base)",
    color: "var(--ink-strong)",
    outline: "none",
    transition: "border-color 150ms",
    fontFamily: "var(--font-sans)",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--ink-strong)",
  };

  const errorMsgStyle: React.CSSProperties = {
    marginTop: "0.25rem",
    fontSize: "0.75rem",
    color: "var(--error-dark)",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--font-sans)" }}>
      {/* Panel izquierdo */}
      <div
        className="hidden md:flex flex-col justify-between"
        style={{ width: "45%", background: "var(--surface-sidebar)", padding: "2.5rem" }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: "var(--sidebar-ink-muted)",
            textTransform: "uppercase",
          }}
        >
          Welve
        </span>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "3rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--sidebar-ink-strong)",
            }}
          >
            Eunoia
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "1rem", color: "var(--sidebar-ink-muted)" }}>
            Beauty Salon · Lima
          </p>
          <div
            style={{
              marginTop: "2rem",
              width: "2rem",
              height: "2px",
              background: "var(--accent)",
              borderRadius: "1px",
            }}
          />
          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "0.875rem",
              color: "var(--sidebar-ink-muted)",
              maxWidth: "28ch",
              lineHeight: 1.6,
            }}
          >
            Crea tu cuenta de acceso al sistema de gestión.
          </p>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--sidebar-ink-muted)" }}>
          © {new Date().getFullYear()} Eunoia Beauty Salon
        </div>
      </div>

      {/* Panel derecho */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-6"
        style={{ background: "var(--surface-bg)" }}
      >
        <div className="md:hidden mb-8 text-center">
          <p style={{ fontSize: "0.75rem", color: "var(--ink-muted)", fontWeight: 500 }}>
            Welve · Eunoia Beauty Salon
          </p>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOutExpo }}
          className="w-full"
          style={{ maxWidth: "22rem" }}
        >
          <div
            style={{
              background: "var(--surface-base)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-base)",
              padding: "2rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--ink-strong)",
              }}
            >
              Crear cuenta
            </h2>
            <p
              style={{
                marginTop: "0.375rem",
                marginBottom: "1.75rem",
                fontSize: "0.875rem",
                color: "var(--ink-muted)",
              }}
            >
              Solo para personal autorizado
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Nombre */}
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="nombre_completo" style={labelStyle}>
                  Nombre completo
                </label>
                <input
                  id="nombre_completo"
                  type="text"
                  autoComplete="name"
                  placeholder="Ana García"
                  {...register("nombre_completo")}
                  style={inputStyle(!!errors.nombre_completo)}
                  onFocus={(e) => { if (!errors.nombre_completo) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!errors.nombre_completo) e.currentTarget.style.borderColor = "var(--border-base)"; }}
                />
                {errors.nombre_completo && (
                  <p role="alert" style={errorMsgStyle}>{errors.nombre_completo.message}</p>
                )}
              </div>

              {/* Correo */}
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="correo" style={labelStyle}>
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="hola@eunoia.pe"
                  {...register("correo")}
                  style={inputStyle(!!errors.correo)}
                  onFocus={(e) => { if (!errors.correo) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!errors.correo) e.currentTarget.style.borderColor = "var(--border-base)"; }}
                />
                {errors.correo && (
                  <p role="alert" style={errorMsgStyle}>{errors.correo.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="contrasena" style={labelStyle}>
                  Contraseña
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="contrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("contrasena")}
                    style={{ ...inputStyle(!!errors.contrasena), paddingRight: "2.5rem" }}
                    onFocus={(e) => { if (!errors.contrasena) e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { if (!errors.contrasena) e.currentTarget.style.borderColor = "var(--border-base)"; }}
                  />
                  <button
                    type="button"
                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setMostrarContrasena((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "0.625rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "var(--ink-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {mostrarContrasena ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.contrasena && (
                  <p role="alert" style={errorMsgStyle}>{errors.contrasena.message}</p>
                )}
              </div>

              {/* Rol */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="rol" style={labelStyle}>
                  Rol
                </label>
                <select
                  id="rol"
                  {...register("rol")}
                  style={{
                    ...inputStyle(!!errors.rol),
                    appearance: "none",
                    cursor: "pointer",
                  }}
                  onFocus={(e) => { if (!errors.rol) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!errors.rol) e.currentTarget.style.borderColor = "var(--border-base)"; }}
                >
                  <option value="">Selecciona un rol</option>
                  <option value="admin">Administrador</option>
                  <option value="trabajador">Especialista</option>
                </select>
                {errors.rol && (
                  <p role="alert" style={errorMsgStyle}>{errors.rol.message}</p>
                )}
              </div>

              {/* Error general */}
              {errorGeneral && (
                <div
                  role="alert"
                  style={{
                    marginBottom: "1rem",
                    padding: "0.625rem 0.75rem",
                    background: "var(--error-light)",
                    borderRadius: "var(--radius-base)",
                    fontSize: "0.875rem",
                    color: "var(--error-dark)",
                  }}
                >
                  {errorGeneral}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  background: isSubmitting ? "var(--accent-hover)" : "var(--accent)",
                  color: "var(--accent-foreground)",
                  border: "none",
                  borderRadius: "var(--radius-base)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting)
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting)
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                }}
              >
                {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
              </motion.button>
            </form>
          </div>

          <p
            style={{
              marginTop: "1.25rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--ink-muted)",
            }}
          >
            ¿Ya tienes acceso?{" "}
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>
              Iniciar sesión
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
