import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Scissors } from "lucide-react";
import axios from "axios";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { IUsuarioPerfil } from "@/types/auth";

const schema = z.object({
  correo: z.string().email("Ingresa un correo válido"),
  contrasena: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── Input reutilizable ───────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
  hasError: boolean;
  errorMsg?: string;
  rightElement?: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}

function InputField({
  id,
  label,
  type,
  placeholder,
  autoComplete,
  hasError,
  errorMsg,
  rightElement,
  inputProps,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--ink-strong)",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={{
            width: "100%",
            padding: rightElement ? "12px 44px 12px 16px" : "12px 16px",
            fontSize: "var(--text-sm)",
            background: "white",
            border: `1.5px solid ${hasError ? "var(--error)" : focused ? "var(--accent)" : "var(--border-base)"}`,
            borderRadius: "var(--radius-xl)",
            color: "var(--ink-strong)",
            outline: "none",
            boxShadow: focused && !hasError ? "0 0 0 3px var(--accent-glow)" : "none",
            transition: "border-color 150ms, box-shadow 150ms",
            fontFamily: "var(--font-sans)",
          }}
        />
        {rightElement && (
          <div
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {rightElement}
          </div>
        )}
      </div>
      {hasError && errorMsg && (
        <p
          role="alert"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--error)",
            margin: 0,
          }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage() {
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
      const resultado = await authService.login({
        correo: data.correo,
        contrasena: data.contrasena,
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
      else if (resultado.rol === "trabajador") navigate("/trabajador/agenda");
      else navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setErrorGeneral("Credenciales incorrectas");
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setErrorGeneral("Cuenta inactiva. Contacta al administrador.");
      } else {
        setErrorGeneral("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-sans)",
        background: "var(--surface-bg)",
      }}
    >
      {/* ── Panel izquierdo (oculto en mobile) ── */}
      <div
        style={{
          width: "45%",
          background: "var(--surface-sidebar)",
          position: "relative",
          overflow: "hidden",
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem",
        }}
        className="md:flex"
      >
        {/* Patrón de puntos */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, oklch(0.75 0.018 285 / 0.10) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          }}
        />

        {/* Blob decorativo principal */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "55%",
            transform: "translate(-50%, -50%)",
            width: 380,
            height: 380,
            borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
            background:
              "radial-gradient(circle at 40% 40%, oklch(0.51 0.261 286 / 0.35) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />

        {/* Blob secundario */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "15%",
            left: "10%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.51 0.261 286 / 0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px 6px 8px",
              borderRadius: "var(--radius-lg)",
              background: "oklch(1 0 0 / 0.08)",
              border: "1px solid oklch(1 0 0 / 0.12)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Scissors size={12} strokeWidth={2} color="white" />
            </div>
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--sidebar-ink-strong)",
              }}
            >
              Welve
            </span>
          </div>
        </div>

        {/* Contenido principal */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontSize: "3.25rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--sidebar-ink-strong)",
              margin: 0,
              textWrap: "balance",
            }}
          >
            Eunoia
            <br />
            Beauty Salon
          </h1>
          <p
            style={{
              marginTop: "var(--space-4)",
              fontSize: "var(--text-base)",
              color: "var(--sidebar-ink-muted)",
              lineHeight: "var(--leading-relaxed)",
              maxWidth: "30ch",
            }}
          >
            Gestión de citas, especialistas y clientes para el salón premium de Lima.
          </p>
          <div
            style={{
              marginTop: "var(--space-8)",
              display: "flex",
              gap: "var(--space-3)",
            }}
          >
            {["Citas", "Pagos", "Clientes"].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  background: "oklch(1 0 0 / 0.1)",
                  border: "1px solid oklch(1 0 0 / 0.15)",
                  fontSize: "var(--text-xs)",
                  color: "var(--sidebar-ink-base)",
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: "var(--text-xs)",
            color: "var(--sidebar-ink-muted)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span>Powered by</span>
          <span style={{ fontWeight: 600, color: "var(--sidebar-ink-base)" }}>Welve</span>
          <span>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          background: "var(--surface-bg)",
        }}
      >
        {/* Logo solo en mobile */}
        <div
          className="md:hidden"
          style={{ marginBottom: "var(--space-8)", textAlign: "center" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--space-2)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--surface-sidebar)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Scissors size={16} strokeWidth={2} color="white" />
            </div>
            <span
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: "var(--ink-strong)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              Eunoia
            </span>
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)", margin: 0 }}>
            Beauty Salon · Lima
          </p>
        </div>

        {/* Card del formulario */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ width: "100%", maxWidth: "26rem" }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "var(--radius-2xl)",
              boxShadow: "var(--shadow-lg)",
              padding: "2.5rem",
            }}
          >
            <div style={{ marginBottom: "var(--space-8)" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "2rem",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--ink-strong)",
                  lineHeight: "var(--leading-tight)",
                }}
              >
                Bienvenida
              </h2>
              <p
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "var(--text-sm)",
                  color: "var(--ink-muted)",
                  margin: 0,
                  marginTop: "var(--space-2)",
                }}
              >
                Ingresa con tu correo y contraseña
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
            >
              <InputField
                id="correo"
                label="Correo electrónico"
                type="email"
                placeholder="hola@eunoia.pe"
                autoComplete="email"
                hasError={!!errors.correo}
                errorMsg={errors.correo?.message}
                inputProps={register("correo")}
              />

              <InputField
                id="contrasena"
                label="Contraseña"
                type={mostrarContrasena ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                hasError={!!errors.contrasena}
                errorMsg={errors.contrasena?.message}
                rightElement={
                  <button
                    type="button"
                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setMostrarContrasena((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      color: "var(--ink-subtle)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {mostrarContrasena ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                }
                inputProps={register("contrasena")}
              />

              {/* Error general */}
              {errorGeneral && (
                <div
                  role="alert"
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--error-light)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "var(--text-sm)",
                    color: "var(--error-dark)",
                    border: "1px solid var(--error)",
                    borderOpacity: 0.3,
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
                  padding: "14px var(--space-5)",
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  background: isSubmitting ? "var(--accent-hover)" : "var(--accent)",
                  color: "var(--accent-foreground)",
                  border: "none",
                  borderRadius: "var(--radius-xl)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "background 150ms, box-shadow 150ms",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "-0.01em",
                  marginTop: "var(--space-2)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--accent-hover)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 12px var(--accent-glow)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--accent)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }
                }}
              >
                {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
              </motion.button>
            </form>
          </div>

          <p
            style={{
              marginTop: "var(--space-5)",
              textAlign: "center",
              fontSize: "var(--text-sm)",
              color: "var(--ink-muted)",
            }}
          >
            ¿Sin acceso?{" "}
            <Link
              to="/registro"
              style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              Solicitar cuenta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
