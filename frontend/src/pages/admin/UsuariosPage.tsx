import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AxiosError } from 'axios';
import {
  AlertCircle, Check, CheckCircle, ChevronDown, ChevronUp, Circle,
  Mail, Pencil, Phone, Shield, User, X,
} from 'lucide-react';
import { usuariosService } from '@/services/usuarios.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { IUsuarioAdmin, RolUsuario } from '@/types/usuarios';

// ─── Constantes ───────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type TabFiltro = 'todos' | 'admin' | 'trabajador' | 'cliente';

const TABS: Array<{ id: TabFiltro; label: string; rol?: RolUsuario }> = [
  { id: 'todos',      label: 'Todos' },
  { id: 'admin',      label: 'Admins',       rol: 'admin' },
  { id: 'trabajador', label: 'Trabajadoras', rol: 'trabajador' },
  { id: 'cliente',    label: 'Clientas',     rol: 'cliente' },
];

const ROL_CFG: Record<RolUsuario, { label: string; bgCls: string; textCls: string }> = {
  admin:      { label: 'Admin',      bgCls: 'bg-accent-subtle',  textCls: 'text-accent' },
  trabajador: { label: 'Trabajadora', bgCls: 'bg-info-light',    textCls: 'text-info' },
  cliente:    { label: 'Clienta',    bgCls: 'bg-border-subtle',  textCls: 'text-ink-muted' },
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const schemaDatos = z.object({
  nombre_completo: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono:        z.string().optional().or(z.literal('')),
});

const schemaCorreo = z.object({
  correo: z.string().email('Correo inválido'),
});

const schemaPassword = z.object({
  password_nueva:    z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar_password: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(v => v.password_nueva === v.confirmar_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar_password'],
});

type FormDatos    = z.infer<typeof schemaDatos>;
type FormCorreo   = z.infer<typeof schemaCorreo>;
type FormPassword = z.infer<typeof schemaPassword>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractError(err: unknown, fallback: string): string {
  const e = err as AxiosError<{ detail?: string }>;
  return e.response?.data?.detail ?? fallback;
}

function iniciales(nombre: string): string {
  return nombre.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function inputCls(err?: boolean) {
  return `w-full px-3 py-2.5 rounded-lg border text-sm text-ink-base bg-surface-bg outline-none transition-colors ${
    err ? 'border-error' : 'border-border-base focus:border-accent'
  }`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BadgeRol({ rol }: { rol: RolUsuario }) {
  const cfg = ROL_CFG[rol];
  return (
    <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-semibold ${cfg.bgCls} ${cfg.textCls}`}>
      {cfg.label}
    </span>
  );
}

function ToggleActivo({ activo, onChange, disabled }: { activo: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => !disabled && onChange(!activo)}
      title={disabled ? 'No puedes desactivarte a ti mismo' : undefined}
      className={`relative w-9 h-5 rounded-full border-none cursor-pointer shrink-0 transition-colors duration-200 ${
        activo ? 'bg-success' : 'bg-border-base'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <motion.div
        animate={{ x: activo ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

interface ToastMsg { id: string; tipo: 'success' | 'error'; texto: string; }

function ToastItem({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${
        msg.tipo === 'success' ? 'bg-success text-white' : 'bg-error text-white'
      }`}
    >
      {msg.tipo === 'success' ? <Check size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
      {msg.texto}
    </motion.div>
  );
}

function SkeletonFila() {
  return (
    <tr>
      {[140, 160, 100, 70, 60, 24, 36].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded shimmer animate-shimmer" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── PanelUsuario ──────────────────────────────────────────────────────────────

interface PanelUsuarioProps {
  usuario: IUsuarioAdmin;
  esMismo: boolean;
  reducedMotion: boolean;
  onActualizado: (u: IUsuarioAdmin) => void;
  onCerrar: () => void;
  onToast: (tipo: ToastMsg['tipo'], texto: string) => void;
}

function SeccionDatos({ usuario, onActualizado, onToast }: Pick<PanelUsuarioProps, 'usuario' | 'onActualizado' | 'onToast'>) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormDatos>({
    resolver: zodResolver(schemaDatos),
    defaultValues: { nombre_completo: usuario.nombre_completo, telefono: usuario.telefono ?? '' },
  });

  const onSubmit = async (values: FormDatos) => {
    try {
      const u = await usuariosService.actualizarUsuario(usuario.id, {
        nombre_completo: values.nombre_completo,
        telefono: values.telefono || null,
      });
      onActualizado(u);
      onToast('success', 'Datos actualizados');
    } catch (err) {
      onToast('error', extractError(err, 'Error al guardar'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nombre completo</label>
        <div className="relative">
          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" strokeWidth={1.5} />
          <input {...register('nombre_completo')} className={`${inputCls(!!errors.nombre_completo)} pl-9`} />
        </div>
        {errors.nombre_completo && <p className="text-xs text-error">{errors.nombre_completo.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Teléfono</label>
        <div className="relative">
          <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" strokeWidth={1.5} />
          <input {...register('telefono')} placeholder="+51 999 000 000" className={`${inputCls(!!errors.telefono)} pl-9`} />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting}
        className="self-end py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-60">
        {isSubmitting ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}

function SeccionCorreo({ usuario, onActualizado, onToast }: Pick<PanelUsuarioProps, 'usuario' | 'onActualizado' | 'onToast'>) {
  const [confirmando, setConfirmando] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormCorreo>({
    resolver: zodResolver(schemaCorreo),
    defaultValues: { correo: usuario.correo ?? '' },
  });

  const correoNuevo = watch('correo');

  const onSubmit = async (values: FormCorreo) => {
    try {
      const u = await usuariosService.actualizarCorreo(usuario.id, values.correo);
      onActualizado(u);
      onToast('success', 'Correo actualizado');
      setConfirmando(false);
    } catch (err) {
      onToast('error', extractError(err, 'Error al cambiar correo'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Mail size={13} className="text-ink-subtle shrink-0" strokeWidth={1.5} />
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Correo electrónico</label>
          {!usuario.correo_verificado && (
            <span className="text-2xs py-0.5 px-2 rounded-full bg-warning-light text-warning font-semibold">Sin verificar</span>
          )}
        </div>
        <input {...register('correo')} type="email" className={inputCls(!!errors.correo)} />
        {errors.correo && <p className="text-xs text-error">{errors.correo.message}</p>}
      </div>

      <AnimatePresence mode="wait">
        {confirmando ? (
          <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 bg-warning-light border border-warning rounded-xl p-3.5"
          >
            <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm text-ink-base">
                ¿Cambiar correo a <strong>{correoNuevo}</strong>? Esto requerirá verificación nuevamente.
              </p>
              <div className="flex gap-2 mt-2.5">
                <button type="button" onClick={() => { setConfirmando(false); reset(); }}
                  className="py-1.5 px-3 rounded-lg border border-border-base text-xs font-medium text-ink-muted bg-white cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="py-1.5 px-3 rounded-lg bg-accent text-accent-foreground border-none text-xs font-semibold cursor-pointer disabled:opacity-60">
                  {isSubmitting ? 'Cambiando…' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button key="btn" type="button" onClick={() => setConfirmando(true)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="self-end py-2 px-4 rounded-lg border border-border-base text-sm font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors">
            Cambiar correo
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}

function SeccionPassword({ usuario, onToast }: Pick<PanelUsuarioProps, 'usuario' | 'onToast'>) {
  const [expandido, setExpandido] = useState(false);
  if (usuario.rol === 'cliente') return null;

  return (
    <div className="flex flex-col gap-0">
      <button type="button"
        onClick={() => setExpandido(e => !e)}
        className="flex items-center justify-between w-full py-2 bg-transparent border-none cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-ink-subtle shrink-0" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Contraseña</span>
        </div>
        {expandido ? <ChevronUp size={14} className="text-ink-subtle" strokeWidth={1.5} /> : <ChevronDown size={14} className="text-ink-subtle" strokeWidth={1.5} />}
      </button>

      <AnimatePresence>
        {expandido && (
          <SeccionPasswordForm usuarioId={usuario.id} onExito={() => { setExpandido(false); onToast('success', 'Contraseña restablecida'); }} onToast={onToast} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SeccionPasswordForm({ usuarioId, onExito, onToast }: { usuarioId: string; onExito: () => void; onToast: (t: ToastMsg['tipo'], m: string) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormPassword>({
    resolver: zodResolver(schemaPassword),
  });

  const onSubmit = async (values: FormPassword) => {
    try {
      await usuariosService.resetearPassword(usuarioId, values.password_nueva);
      onExito();
    } catch (err) {
      onToast('error', extractError(err, 'Error al restablecer contraseña'));
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="overflow-hidden"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 pt-3 pb-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nueva contraseña</label>
          <input {...register('password_nueva')} type="password" placeholder="Mínimo 8 caracteres" className={inputCls(!!errors.password_nueva)} />
          {errors.password_nueva && <p className="text-xs text-error">{errors.password_nueva.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Confirmar contraseña</label>
          <input {...register('confirmar_password')} type="password" placeholder="Repite la contraseña" className={inputCls(!!errors.confirmar_password)} />
          {errors.confirmar_password && <p className="text-xs text-error">{errors.confirmar_password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
          className="self-end py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-60">
          {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
        </button>
      </form>
    </motion.div>
  );
}

function SeccionEstado({ usuario, esMismo, onActualizado, onToast }: Pick<PanelUsuarioProps, 'usuario' | 'esMismo' | 'onActualizado' | 'onToast'>) {
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = async (nuevoEstado: boolean) => {
    setGuardando(true);
    try {
      const u = await usuariosService.cambiarEstado(usuario.id, nuevoEstado);
      onActualizado(u);
      onToast('success', nuevoEstado ? 'Cuenta activada' : 'Cuenta desactivada');
      setConfirmando(false);
    } catch (err) {
      onToast('error', extractError(err, 'Error al cambiar estado'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink-base">Estado de la cuenta</p>
          <p className={`text-xs mt-0.5 ${usuario.esta_activo ? 'text-success' : 'text-error'}`}>
            {usuario.esta_activo ? 'Activo — puede iniciar sesión' : 'Inactivo — sin acceso al sistema'}
          </p>
        </div>
        <ToggleActivo
          activo={usuario.esta_activo}
          onChange={(v) => { if (!v) setConfirmando(true); else cambiar(true); }}
          disabled={esMismo || guardando}
        />
      </div>

      <AnimatePresence>
        {confirmando && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 bg-error-light border border-error rounded-xl p-3.5">
              <AlertCircle size={14} className="text-error shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex-1">
                <p className="text-sm text-ink-base">
                  ¿Desactivar a <strong>{usuario.nombre_completo}</strong>? No podrá iniciar sesión.
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => setConfirmando(false)}
                    className="py-1.5 px-3 rounded-lg border border-border-base text-xs font-medium text-ink-muted bg-white cursor-pointer">
                    Cancelar
                  </button>
                  <button onClick={() => cambiar(false)} disabled={guardando}
                    className="py-1.5 px-3 rounded-lg bg-error text-white border-none text-xs font-semibold cursor-pointer disabled:opacity-60">
                    {guardando ? 'Desactivando…' : 'Sí, desactivar'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelUsuario({ usuario, esMismo, reducedMotion, onActualizado, onCerrar, onToast }: PanelUsuarioProps) {
  const [local, setLocal] = useState<IUsuarioAdmin>(usuario);

  const actualizar = (u: IUsuarioAdmin) => { setLocal(u); onActualizado(u); };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-modal-backdrop"
        style={{ background: 'oklch(0.12 0.038 288 / 0.5)' }}
        onClick={onCerrar}
      />
      <motion.div
        initial={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: EASE }}
        className="fixed inset-y-0 right-0 w-[440px] bg-surface-raised flex flex-col z-modal shadow-modal"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-base shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center text-sm font-bold shrink-0">
              {iniciales(local.nombre_completo)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-ink-strong truncate">{local.nombre_completo}</h2>
              <div className="flex items-center gap-2 mt-1">
                <BadgeRol rol={local.rol} />
                {!local.esta_activo && (
                  <span className="text-2xs py-0.5 px-2 rounded-full bg-error-light text-error font-semibold">Inactivo</span>
                )}
              </div>
            </div>
            <button onClick={onCerrar}
              className="w-8 h-8 rounded-lg border border-border-base flex items-center justify-center text-ink-muted hover:text-ink-strong cursor-pointer transition-colors shrink-0">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-0">
          {/* Datos básicos */}
          <div className="px-6 py-5 border-b border-border-subtle">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-4">Datos personales</p>
            <SeccionDatos usuario={local} onActualizado={actualizar} onToast={onToast} />
          </div>

          {/* Correo */}
          <div className="px-6 py-5 border-b border-border-subtle">
            <SeccionCorreo usuario={local} onActualizado={actualizar} onToast={onToast} />
          </div>

          {/* Password (solo admin/trabajador) */}
          {local.rol !== 'cliente' && (
            <div className="px-6 py-4 border-b border-border-subtle">
              <SeccionPassword usuario={local} onToast={onToast} />
            </div>
          )}

          {/* Estado */}
          <div className="px-6 py-5">
            <SeccionEstado usuario={local} esMismo={esMismo} onActualizado={actualizar} onToast={onToast} />
          </div>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

// ─── UsuariosPage ──────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const usuarioActual = useAuthStore(s => s.usuario);

  const [usuarios,        setUsuarios]       = useState<IUsuarioAdmin[]>([]);
  const [cargando,        setCargando]       = useState(true);
  const [errorCarga,      setErrorCarga]     = useState<string | null>(null);
  const [tabFiltro,       setTabFiltro]      = useState<TabFiltro>('todos');
  const [soloActivos,     setSoloActivos]    = useState(false);
  const [panelUsuario,    setPanelUsuario]   = useState<IUsuarioAdmin | null>(null);
  const [toasts,          setToasts]         = useState<ToastMsg[]>([]);
  const [reducedMotion]   = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const highlightId = searchParams.get('highlight');

  const agregarToast = (tipo: ToastMsg['tipo'], texto: string) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, tipo, texto }]);
  };
  const quitarToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  const fetchDatos = () => usuariosService.obtenerUsuarios();

  useEffect(() => {
    fetchDatos()
      .then(data => {
        setUsuarios(data);
        setErrorCarga(null);
        if (highlightId) {
          const u = data.find(x => x.id === highlightId);
          if (u) setPanelUsuario(u);
        }
      })
      .catch(() => setErrorCarga('Error al cargar usuarios. Verifica la conexión.'))
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usuariosFiltrados = usuarios.filter(u => {
    const rolOk = tabFiltro === 'todos' || u.rol === tabFiltro;
    const activoOk = !soloActivos || u.esta_activo;
    return rolOk && activoOk;
  });

  const handleActualizado = (u: IUsuarioAdmin) => {
    setUsuarios(prev => prev.map(x => x.id === u.id ? u : x));
    if (panelUsuario?.id === u.id) setPanelUsuario(u);
  };

  const handleCambiarEstado = async (u: IUsuarioAdmin) => {
    const nuevoEstado = !u.esta_activo;
    // optimistic
    const optimista = { ...u, esta_activo: nuevoEstado };
    setUsuarios(prev => prev.map(x => x.id === u.id ? optimista : x));
    try {
      const actualizado = await usuariosService.cambiarEstado(u.id, nuevoEstado);
      setUsuarios(prev => prev.map(x => x.id === actualizado.id ? actualizado : x));
      agregarToast('success', nuevoEstado ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (err) {
      // revert
      setUsuarios(prev => prev.map(x => x.id === u.id ? u : x));
      agregarToast('error', (err as AxiosError<{ detail?: string }>).response?.data?.detail ?? 'Error al cambiar estado');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-ink-strong tracking-tight flex-1">Usuarios</h1>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <ToggleActivo activo={soloActivos} onChange={setSoloActivos} />
            <span className="text-sm font-medium text-ink-muted">Solo activos</span>
          </label>
        </div>

        {/* Error */}
        {errorCarga && (
          <div className="flex items-center gap-3 bg-error-light border border-error rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-error shrink-0" strokeWidth={2} />
            <p className="text-sm text-error flex-1">{errorCarga}</p>
            <button onClick={() => {
              setCargando(true); setErrorCarga(null);
              fetchDatos()
                .then(d => setUsuarios(d))
                .catch(() => setErrorCarga('Error al cargar usuarios.'))
                .finally(() => setCargando(false));
            }} className="text-xs font-semibold text-error underline cursor-pointer bg-transparent border-none">
              Reintentar
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border-subtle gap-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setTabFiltro(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors bg-transparent ${
                tabFiltro === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-base'
              }`}>
              {tab.label}
              {!cargando && (
                <span className="ml-2 text-xs text-ink-subtle">
                  {usuarios.filter(u => (tab.rol ? u.rol === tab.rol : true) && (!soloActivos || u.esta_activo)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-border-subtle overflow-hidden bg-surface-raised shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-bg">
                {['Nombre', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Verificado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando
                ? [1, 2, 3, 4, 5].map(i => <SkeletonFila key={i} />)
                : usuariosFiltrados.length === 0
                ? (
                  <tr><td colSpan={7} className="py-14 text-center text-sm text-ink-subtle">Sin usuarios para mostrar</td></tr>
                )
                : usuariosFiltrados.map(u => {
                  const esMismo = usuarioActual?.id === u.id || usuarioActual?.usuario_id === u.id;
                  const esHighlighted = highlightId === u.id;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={esHighlighted ? { backgroundColor: 'oklch(0.51 0.261 286 / 0.08)' } : undefined}
                      animate={{ backgroundColor: 'transparent' }}
                      transition={{ duration: 2, delay: 0.3 }}
                      className={`border-b border-border-subtle last:border-0 group hover:bg-[oklch(0.97_0.01_284)] transition-colors ${
                        !u.esta_activo ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 font-medium text-ink-strong">{u.nombre_completo}</td>
                      <td className="px-4 py-3.5 text-ink-muted">{u.correo ?? <span className="text-ink-subtle italic">—</span>}</td>
                      <td className="px-4 py-3.5 font-mono text-ink-muted text-xs">{u.telefono ?? <span className="text-ink-subtle italic">—</span>}</td>
                      <td className="px-4 py-3.5"><BadgeRol rol={u.rol} /></td>
                      <td className="px-4 py-3.5">
                        <ToggleActivo
                          activo={u.esta_activo}
                          onChange={() => !esMismo && handleCambiarEstado(u)}
                          disabled={esMismo}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        {u.correo_verificado
                          ? <CheckCircle size={16} className="text-success" strokeWidth={1.5} />
                          : <Circle size={16} className="text-ink-subtle" strokeWidth={1.5} />
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => { navigate(`/admin/usuarios?highlight=${u.id}`, { replace: true }); setPanelUsuario(u); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border-base text-xs font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg"
                        >
                          <Pencil size={11} strokeWidth={1.5} />
                          Editar
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Panel lateral */}
      <AnimatePresence>
        {panelUsuario && (
          <PanelUsuario
            key={panelUsuario.id}
            usuario={panelUsuario}
            esMismo={usuarioActual?.id === panelUsuario.id || usuarioActual?.usuario_id === panelUsuario.id}
            reducedMotion={reducedMotion}
            onActualizado={handleActualizado}
            onCerrar={() => { setPanelUsuario(null); navigate('/admin/usuarios', { replace: true }); }}
            onToast={agregarToast}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      {createPortal(
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-toast pointer-events-none">
          <AnimatePresence>
            {toasts.map(msg => <ToastItem key={msg.id} msg={msg} onClose={() => quitarToast(msg.id)} />)}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
