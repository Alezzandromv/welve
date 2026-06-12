import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Loader2, Pencil, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import type { IActualizarPerfil, ICambiarPassword } from '@/types/auth';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const schemaPerfil = z.object({
  nombre_completo: z.string().min(2, 'Mínimo 2 caracteres'),
  correo:   z.string().email('Correo inválido').optional().or(z.literal('')),
  telefono: z.string().min(7, 'Mínimo 7 dígitos').optional().or(z.literal('')),
});

const schemaPassword = z
  .object({
    password_actual:  z.string().min(1, 'Ingresa tu contraseña actual'),
    password_nueva:   z.string().min(8, 'Mínimo 8 caracteres'),
    password_confirma: z.string(),
  })
  .refine((d) => d.password_nueva === d.password_confirma, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirma'],
  });

type FormPerfil    = z.infer<typeof schemaPerfil>;
type FormPassword  = z.infer<typeof schemaPassword>;

// ─── Pequeños helpers ─────────────────────────────────────────────────────────

function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima',
  });
}

function Campo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted font-medium">{label}</span>
      <span className="text-sm text-ink-base">{value || '—'}</span>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Field({ label, error, id, onFocus: rhfOnFocus, onBlur: rhfOnBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-ink-muted"
      >
        {label}
      </label>
      <input
        id={id}
        {...rest}
        onFocus={(e) => { setFocused(true); rhfOnFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rhfOnBlur?.(e); }}
        className={`py-2 px-3 rounded-lg border bg-surface-bg text-ink-strong text-sm outline-none w-full box-border transition-[border-color] duration-150 ${
          error ? 'border-error' : focused ? 'border-accent' : 'border-border-base'
        }`}
      />
      {error && (
        <span className="text-xs text-error">{error}</span>
      )}
    </div>
  );
}

function Toast({
  tipo,
  mensaje,
}: {
  tipo: 'ok' | 'error';
  mensaje: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm mb-4 border ${
        tipo === 'ok' ? 'text-accent' : 'text-error'
      }`}
      style={{
        background: tipo === 'ok' ? 'oklch(0.51 0.261 286 / 0.1)' : 'oklch(0.57 0.21 22 / 0.1)',
        borderColor: tipo === 'ok' ? 'oklch(0.51 0.261 286 / 0.25)' : 'oklch(0.57 0.21 22 / 0.25)',
      }}
    >
      {tipo === 'ok' ? <Check size={14} strokeWidth={2} /> : <X size={14} strokeWidth={2} />}
      {mensaje}
    </motion.div>
  );
}

// ─── Sección de contraseña ────────────────────────────────────────────────────

function SeccionPassword() {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormPassword>({ resolver: zodResolver(schemaPassword) });

  async function onSubmit(values: FormPassword) {
    setGuardando(true);
    setMensaje(null);
    try {
      const body: ICambiarPassword = {
        password_actual: values.password_actual,
        password_nueva:  values.password_nueva,
      };
      const res = await authService.cambiarPassword(body);
      setMensaje({ tipo: 'ok', texto: res.mensaje });
      reset();
      setTimeout(() => setAbierto(false), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'No se pudo cambiar la contraseña';
      setMensaje({ tipo: 'error', texto: msg });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border border-border-subtle rounded-2xl overflow-hidden">
      <button
        onClick={() => setAbierto((p) => !p)}
        className="w-full flex items-center justify-between py-4 px-5 bg-surface-raised border-none cursor-pointer text-ink-strong text-sm font-semibold"
      >
        Cambiar contraseña
        <motion.span animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} strokeWidth={2} className="text-ink-muted" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            key="password-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4 p-5 border-t border-border-subtle"
            >
              <AnimatePresence>
                {mensaje && (
                  <Toast key="toast-pwd" tipo={mensaje.tipo} mensaje={mensaje.texto} />
                )}
              </AnimatePresence>

              <Field
                id="password_actual"
                label="Contraseña actual"
                type="password"
                autoComplete="current-password"
                error={errors.password_actual?.message}
                {...register('password_actual')}
              />
              <Field
                id="password_nueva"
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                error={errors.password_nueva?.message}
                {...register('password_nueva')}
              />
              <Field
                id="password_confirma"
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                error={errors.password_confirma?.message}
                {...register('password_confirma')}
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border-none text-white text-sm font-semibold transition-opacity duration-150 ${
                    guardando ? 'bg-accent-subtle cursor-not-allowed opacity-70' : 'bg-accent cursor-pointer'
                  }`}
                >
                  {guardando && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                  Guardar contraseña
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const usuario        = useAuthStore((s) => s.usuario);
  const actualizarUsuario = useAuthStore((s) => s.actualizarUsuario);

  const [editando, setEditando]   = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje]     = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormPerfil>({
    resolver: zodResolver(schemaPerfil),
    defaultValues: {
      nombre_completo: usuario?.nombre_completo ?? '',
      correo:          usuario?.correo ?? '',
      telefono:        usuario?.telefono ?? '',
    },
  });

  useEffect(() => {
    if (usuario) {
      reset({
        nombre_completo: usuario.nombre_completo,
        correo:          usuario.correo ?? '',
        telefono:        usuario.telefono ?? '',
      });
    }
  }, [usuario, reset]);

  async function onSubmit(values: FormPerfil) {
    setGuardando(true);
    setMensaje(null);
    try {
      const body: IActualizarPerfil = {
        nombre_completo: values.nombre_completo,
        correo:   values.correo   || undefined,
        telefono: values.telefono || undefined,
      };
      const actualizado = await authService.actualizarPerfil(body);
      actualizarUsuario(actualizado);
      setMensaje({ tipo: 'ok', texto: 'Perfil actualizado correctamente' });
      setEditando(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'No se pudo actualizar el perfil';
      setMensaje({ tipo: 'error', texto: msg });
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setEditando(false);
    setMensaje(null);
    reset({
      nombre_completo: usuario?.nombre_completo ?? '',
      correo:          usuario?.correo ?? '',
      telefono:        usuario?.telefono ?? '',
    });
  }

  const iniciales = usuario
    ? usuario.nombre_completo.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-ink-strong m-0">Perfil</h1>
        <p className="m-0 mt-0.5 text-sm text-ink-muted">
          Configura tu información personal
        </p>
      </div>

      <div className="max-w-[600px] flex flex-col gap-5">

        {/* Avatar + nombre */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface-raised border border-border-subtle rounded-2xl p-6 flex items-center gap-5"
        >
          {usuario?.foto_perfil_url ? (
            <img
              src={usuario.foto_perfil_url}
              alt={usuario.nombre_completo}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-[1.375rem] font-bold shrink-0">
              {iniciales}
            </div>
          )}
          <div>
            <div className="text-lg font-bold text-ink-strong">
              {usuario?.nombre_completo}
            </div>
            <div className="inline-flex items-center mt-1 py-[2px] px-2 rounded-full bg-accent-glow text-accent text-xs font-semibold capitalize">
              {usuario?.rol}
            </div>
          </div>
        </motion.div>

        {/* Formulario */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden"
        >
          {/* Header tarjeta */}
          <div className="flex items-center justify-between py-4 px-5 border-b border-border-subtle">
            <span className="text-base font-semibold text-ink-strong">
              Información personal
            </span>
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="inline-flex items-center gap-1 py-1 px-3 rounded-lg border border-border-base bg-transparent text-ink-base text-xs font-medium cursor-pointer"
              >
                <Pencil size={12} strokeWidth={2} />
                Editar
              </button>
            )}
          </div>

          <div className="p-5">
            <AnimatePresence>
              {mensaje && (
                <Toast key="toast-perfil" tipo={mensaje.tipo} mensaje={mensaje.texto} />
              )}
            </AnimatePresence>

            {editando ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <Field
                  id="nombre_completo"
                  label="Nombre completo"
                  type="text"
                  autoComplete="name"
                  error={errors.nombre_completo?.message}
                  {...register('nombre_completo')}
                />
                <Field
                  id="correo"
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  error={errors.correo?.message}
                  {...register('correo')}
                />
                <Field
                  id="telefono"
                  label="Teléfono"
                  type="tel"
                  autoComplete="tel"
                  error={errors.telefono?.message}
                  {...register('telefono')}
                />

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={cancelar}
                    className="py-2 px-4 rounded-lg border border-border-base bg-transparent text-ink-base text-sm font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando || !isDirty}
                    className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-lg border-none text-white text-sm font-semibold transition-opacity duration-150 ${
                      guardando || !isDirty ? 'bg-accent-subtle cursor-not-allowed opacity-70' : 'bg-accent cursor-pointer'
                    }`}
                  >
                    {guardando && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
                    Guardar cambios
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                <Campo label="Nombre completo" value={usuario?.nombre_completo} />
                <Campo label="Correo electrónico" value={usuario?.correo} />
                <Campo label="Teléfono" value={usuario?.telefono} />
                <Campo label="Rol" value={usuario?.rol} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Info de cuenta (solo lectura) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="bg-surface-raised border border-border-subtle rounded-2xl p-5"
        >
          <div className="text-base font-semibold text-ink-strong mb-4">
            Información de la cuenta
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Campo label="Fecha de creación" value={formatearFecha(usuario?.fecha_creacion)} />
            <Campo label="Último acceso" value={formatearFecha(usuario?.ultimo_acceso)} />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted font-medium">
                Notificaciones WhatsApp
              </span>
              <span
                className={`inline-flex items-center w-fit py-[2px] px-2 rounded-full text-xs font-semibold ${
                  usuario?.acepta_whatsapp
                    ? 'bg-estado-confirmada-bg text-estado-confirmada'
                    : 'bg-estado-cancelada-bg text-estado-cancelada'
                }`}
              >
                {usuario?.acepta_whatsapp ? 'Activas' : 'Desactivadas'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Cambiar contraseña */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <SeccionPassword />
        </motion.div>
      </div>
    </div>
  );
}
