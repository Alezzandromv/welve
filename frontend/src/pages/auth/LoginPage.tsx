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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-strong">
        {label}
      </label>
      <div className="relative">
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
          className={`w-full text-sm bg-white rounded-2xl text-ink-strong outline-none transition-[border-color,box-shadow] duration-150 border-[1.5px] ${
            hasError
              ? "border-error"
              : focused
                ? "border-accent shadow-[0_0_0_3px_var(--accent-glow)]"
                : "border-border-base"
          } ${rightElement ? "pr-11 pl-4 py-3" : "px-4 py-3"}`}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {hasError && errorMsg && (
        <p role="alert" className="text-xs text-error m-0">
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
    <div className="min-h-screen flex bg-surface-bg">
      {/* ── Panel izquierdo (oculto en mobile) ── */}
      <div className="hidden md:flex w-[45%] bg-surface-sidebar relative overflow-hidden flex-col justify-between p-10">
        {/* Patrón de puntos */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.75 0.018 285 / 0.10) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Blob decorativo principal */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "50%", left: "55%",
            transform: "translate(-50%, -50%)",
            width: 380, height: 380,
            borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
            background: "radial-gradient(circle at 40% 40%, oklch(0.51 0.261 286 / 0.35) 0%, transparent 68%)",
          }}
        />

        {/* Blob secundario */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            bottom: "15%", left: "10%",
            width: 180, height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.51 0.261 286 / 0.2) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 py-1.5 px-3 pl-2 rounded-xl border"
            style={{ background: "oklch(1 0 0 / 0.08)", borderColor: "oklch(1 0 0 / 0.12)" }}
          >
            <div className="w-6 h-6 rounded-[6px] bg-accent flex items-center justify-center">
              <Scissors size={12} strokeWidth={2} color="white" />
            </div>
            <span className="text-sm font-semibold text-sidebar-ink-strong">Welve</span>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="relative z-10">
          <h1
            className="text-sidebar-ink-strong m-0"
            style={{ fontSize: "3.25rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, textWrap: "balance" } as React.CSSProperties}
          >
            Eunoia
            <br />
            Beauty Salon
          </h1>
          <p className="mt-4 text-base text-sidebar-ink-muted leading-relaxed max-w-[30ch]">
            Gestión de citas, especialistas y clientes para el salón premium de Lima.
          </p>
          <div className="mt-8 flex gap-3">
            {["Citas", "Pagos", "Clientes"].map((tag) => (
              <span
                key={tag}
                className="py-1 px-2.5 rounded-full text-xs font-medium text-sidebar-ink-base border"
                style={{ background: "oklch(1 0 0 / 0.1)", borderColor: "oklch(1 0 0 / 0.15)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div className="relative z-10 text-xs text-sidebar-ink-muted flex items-center gap-2">
          <span>Powered by</span>
          <span className="font-semibold text-sidebar-ink-base">Welve</span>
          <span>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-bg">
        {/* Logo solo en mobile */}
        <div className="md:hidden mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-[10px] bg-surface-sidebar flex items-center justify-center">
              <Scissors size={16} strokeWidth={2} color="white" />
            </div>
            <span className="text-lg font-bold text-ink-strong tracking-tight">Eunoia</span>
          </div>
          <p className="text-sm text-ink-muted m-0">Beauty Salon · Lima</p>
        </div>

        {/* Card del formulario */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="w-full max-w-[26rem]"
        >
          <div className="bg-white rounded-3xl shadow-lg p-10">
            <div className="mb-8">
              <h2
                className="m-0 font-bold text-ink-strong leading-tight"
                style={{ fontSize: "2rem", letterSpacing: "-0.03em" }}
              >
                Bienvenida
              </h2>
              <p className="mt-2 text-sm text-ink-muted m-0">
                Ingresa con tu correo y contraseña
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4"
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
                    className="bg-transparent border-none cursor-pointer p-0.5 text-ink-subtle flex items-center"
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
                  className="py-3 px-4 bg-error-light rounded-xl text-sm text-error-dark border border-error/30"
                >
                  {errorGeneral}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                className={`w-full py-3.5 px-5 text-base font-semibold text-accent-foreground border-none rounded-2xl transition-[background,box-shadow] duration-150 mt-2 tracking-tight ${
                  isSubmitting
                    ? "bg-accent-hover cursor-not-allowed"
                    : "bg-accent cursor-pointer hover:bg-accent-hover hover:shadow-[0_4px_12px_var(--accent-glow)]"
                }`}
              >
                {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
              </motion.button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-ink-muted">
            ¿Sin acceso?{" "}
            <Link to="/registro" className="text-accent font-semibold no-underline">
              Solicitar cuenta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
