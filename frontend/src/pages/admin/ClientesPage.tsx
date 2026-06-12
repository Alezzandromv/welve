import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { ComponentType } from 'react';
import {
  AlertCircle, AlertTriangle, Calendar, Check, Eye, FileText,
  HeartPulse, Mail, Phone, Plus, Repeat2,
  Search, ShieldOff, User, UserCheck, X,
} from 'lucide-react';
import { clientesService } from '@/services/clientes.service';
import type { ICliente, IFichaSalud, IFichaSaludCreate, SeveridadFicha } from '@/types/clientes';
import type { ICita, EstadoCita } from '@/types/citas';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabPanel = 'perfil' | 'historial' | 'salud' | 'notas';
type FiltroEstado = 'todas' | 'activa' | 'bloqueada';

interface CacheCliente {
  ultimaVisita: string | null;
  totalVisitas: number;
}

interface ToastMsg {
  id: string;
  tipo: 'success' | 'error';
  texto: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ESTADO_CITA_CFG: Record<EstadoCita, { label: string; colorCls: string; bgCls: string }> = {
  pendiente:        { label: 'Pendiente',  colorCls: 'text-warning',   bgCls: 'bg-warning-light' },
  confirmada:       { label: 'Confirmada', colorCls: 'text-info',      bgCls: 'bg-info-light'    },
  en_curso:         { label: 'En curso',   colorCls: 'text-accent',    bgCls: 'bg-accent-subtle' },
  completada:       { label: 'Completada', colorCls: 'text-success',   bgCls: 'bg-success-light' },
  cancelada:        { label: 'Cancelada',  colorCls: 'text-ink-muted', bgCls: 'bg-border-subtle' },
  cancelada_tardia: { label: 'Tardía',     colorCls: 'text-error',     bgCls: 'bg-error-light'   },
  no_show:          { label: 'No show',    colorCls: 'text-error',     bgCls: 'bg-error-light'   },
};

const SEVERIDAD_CFG: Record<SeveridadFicha, { label: string; colorCls: string; bgCls: string; borderCls: string }> = {
  informativa: { label: 'Info',     colorCls: 'text-info',    bgCls: 'bg-info-light',    borderCls: 'border-info'    },
  moderada:    { label: 'Moderada', colorCls: 'text-warning', bgCls: 'bg-warning-light', borderCls: 'border-warning' },
  critica:     { label: 'Crítica',  colorCls: 'text-error',   bgCls: 'bg-error-light',   borderCls: 'border-error'   },
};

const TABS_PANEL: Array<{ id: TabPanel; label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = [
  { id: 'perfil',    label: 'Perfil',    Icon: User       },
  { id: 'historial', label: 'Historial', Icon: Calendar   },
  { id: 'salud',     label: 'Salud',     Icon: HeartPulse },
  { id: 'notas',     label: 'Notas',     Icon: FileText   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function fechaRelativa(isoStr: string | null | undefined): string {
  if (!isoStr) return 'Sin visitas';
  const dias = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7)  return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem.`;
  if (dias < 365) return `Hace ${Math.floor(dias / 30)} meses`;
  return 'Hace más de 1 año';
}

function formatFechaCorta(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── BadgeEstado ──────────────────────────────────────────────────────────────

function BadgeEstado({ bloqueada }: { bloqueada: boolean }) {
  return (
    <span className={`inline-flex items-center py-0.5 px-2 rounded-full text-2xs font-semibold ${
      bloqueada ? 'bg-error-light text-error' : 'bg-success-light text-success'
    }`}>
      {bloqueada ? 'Bloqueada' : 'Activa'}
    </span>
  );
}

// ─── SkeletonFila ─────────────────────────────────────────────────────────────

function SkeletonFila() {
  return (
    <div className="grid px-5 py-3.5 border-b border-border-subtle gap-4 items-center"
      style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 0.8fr 60px' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full shimmer animate-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3.5 w-28 rounded shimmer animate-shimmer" />
          <div className="h-2.5 w-20 rounded shimmer animate-shimmer" />
        </div>
      </div>
      <div className="h-3 w-24 rounded shimmer animate-shimmer" />
      <div className="h-3 w-16 rounded shimmer animate-shimmer" />
      <div className="h-3 w-8 rounded shimmer animate-shimmer" />
      <div className="h-3 w-4 rounded shimmer animate-shimmer" />
      <div className="h-5 w-14 rounded-full shimmer animate-shimmer" />
      <div />
    </div>
  );
}

// ─── ToastItem ────────────────────────────────────────────────────────────────

function ToastItem({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-modal text-sm font-medium pointer-events-auto ${
        msg.tipo === 'success' ? 'bg-success text-white' : 'bg-error text-white'
      }`}
    >
      {msg.tipo === 'success'
        ? <Check size={14} strokeWidth={2.5} />
        : <AlertTriangle size={14} strokeWidth={2.5} />}
      {msg.texto}
    </motion.div>
  );
}

// ─── PanelBloqueo ─────────────────────────────────────────────────────────────

interface PanelBloqueoProps {
  cliente: ICliente;
  cargando: boolean;
  onConfirmar: (motivo: string) => Promise<void>;
  onCerrar: () => void;
}

function PanelBloqueo({ cliente, cargando, onConfirmar, onCerrar }: PanelBloqueoProps) {
  const [motivo, setMotivo] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const handleSubmit = async () => {
    if (!motivo.trim()) { setErrorLocal('El motivo es requerido'); return; }
    await onConfirmar(motivo.trim());
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-surface-sidebar/30"
        style={{ zIndex: 450 }}
        onClick={onCerrar}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.26, ease: EASE }}
        className="fixed inset-y-0 right-0 w-[340px] bg-surface-raised flex flex-col shadow-modal"
        style={{ zIndex: 500 }}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-base shrink-0">
          <div>
            <p className="text-2xs font-bold text-error uppercase tracking-[0.06em] mb-1">Bloquear clienta</p>
            <p className="text-base font-semibold text-ink-strong">{cliente.nombre_completo ?? '—'}</p>
          </div>
          <button onClick={onCerrar}
            className="mt-0.5 w-7 h-7 rounded-lg border border-border-base flex items-center justify-center text-ink-muted hover:text-ink-strong cursor-pointer transition-colors shrink-0">
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 overflow-y-auto flex flex-col gap-4">
          <p className="text-sm text-ink-base leading-relaxed">
            Una vez bloqueada, no podrá hacer nuevas reservas. El bloqueo se puede revertir en cualquier momento.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Motivo <span className="text-error normal-case font-normal">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => { setMotivo(e.target.value); if (errorLocal) setErrorLocal(''); }}
              placeholder="Describe el motivo del bloqueo…"
              rows={4}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm text-ink-base bg-surface-bg outline-none resize-none leading-relaxed transition-colors ${
                errorLocal ? 'border-error' : 'border-border-base focus:border-accent'
              }`}
            />
            {errorLocal && <p className="text-xs text-error">{errorLocal}</p>}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-5 border-t border-border-base shrink-0">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 rounded-lg border border-border-base text-sm font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={cargando}
            className="flex-1 py-2.5 rounded-lg bg-error text-white text-sm font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
            {cargando ? 'Bloqueando…' : 'Bloquear'}
          </button>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

// ─── TabPerfilContent ─────────────────────────────────────────────────────────

interface TabPerfilContentProps {
  cliente: ICliente;
  historial: ICita[];
  cargandoDatos: boolean;
  cargandoAccion: boolean;
  onBloquear: () => void;
  onDesbloquear: () => Promise<void>;
  onActualizarDatos: (datos: { nombre_completo?: string; telefono?: string | null }) => Promise<void>;
  onToastPerfil: (tipo: 'success' | 'error', texto: string) => void;
}

function TabPerfilContent({ cliente, historial, cargandoDatos, cargandoAccion, onBloquear, onDesbloquear, onActualizarDatos, onToastPerfil }: TabPerfilContentProps) {
  const navigate = useNavigate();
  const [nombreEdit, setNombreEdit] = useState(cliente.nombre_completo ?? '');
  const [telefonoEdit, setTelefonoEdit] = useState(cliente.telefono ?? '');
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  const stats = useMemo(() => {
    const completadas = [...historial.filter(c => c.estado === 'completada')]
      .sort((a, b) => new Date(b.programada_en).getTime() - new Date(a.programada_en).getTime());
    const conteo: Record<string, number> = {};
    completadas.forEach(c => {
      if (c.nombre_servicio) conteo[c.nombre_servicio] = (conteo[c.nombre_servicio] ?? 0) + 1;
    });
    const servicioFrecuente = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { totalVisitas: completadas.length, ultimaVisita: completadas[0]?.programada_en ?? null, servicioFrecuente };
  }, [historial]);

  const guardarDatos = async () => {
    if (!nombreEdit.trim() || nombreEdit.trim().length < 2) {
      onToastPerfil('error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }
    setGuardandoDatos(true);
    try {
      await onActualizarDatos({ nombre_completo: nombreEdit.trim(), telefono: telefonoEdit || null });
      onToastPerfil('success', 'Datos actualizados');
    } catch {
      onToastPerfil('error', 'Error al guardar datos');
    } finally {
      setGuardandoDatos(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Datos personales (editable) */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Datos personales</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-subtle font-medium">Nombre</label>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-surface-bg border border-border-subtle flex items-center justify-center shrink-0">
                <User size={12} className="text-ink-muted" strokeWidth={1.5} />
              </div>
              <input
                value={nombreEdit}
                onChange={e => setNombreEdit(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-base text-sm text-ink-base bg-surface-bg outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-subtle font-medium">Teléfono</label>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-surface-bg border border-border-subtle flex items-center justify-center shrink-0">
                <Phone size={12} className="text-ink-muted" strokeWidth={1.5} />
              </div>
              <input
                value={telefonoEdit}
                onChange={e => setTelefonoEdit(e.target.value)}
                placeholder="+51 999 000 000"
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-base text-sm font-mono text-ink-base bg-surface-bg outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          {cliente.correo && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-subtle font-medium">Correo</label>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-surface-bg border border-border-subtle flex items-center justify-center shrink-0">
                  <Mail size={12} className="text-ink-muted" strokeWidth={1.5} />
                </div>
                <span className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-subtle text-sm text-ink-muted bg-surface-bg select-text truncate">
                  {cliente.correo}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-ink-subtle ml-9">
                <AlertCircle size={10} strokeWidth={2} className="text-ink-subtle shrink-0" />
                <span>Solo se edita desde</span>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/usuarios?highlight=${cliente.usuario_id}`)}
                  className="font-semibold text-accent underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 text-[11px]"
                >
                  Administración de Usuarios
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={guardarDatos} disabled={guardandoDatos}
              className="py-1.5 px-3.5 rounded-lg bg-accent text-accent-foreground border-none text-xs font-semibold cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-60">
              {guardandoDatos ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border-subtle" />

      {/* Estadísticas */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Estadísticas</p>
        {cargandoDatos ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-xl shimmer animate-shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-bg border border-border-subtle p-3.5 text-center">
              <p className="text-2xl font-bold text-ink-strong tracking-tight leading-none">{stats.totalVisitas}</p>
              <p className="text-2xs text-ink-muted mt-1.5">Total visitas</p>
            </div>
            <div className="rounded-xl bg-surface-bg border border-border-subtle p-3.5 text-center">
              <p className="text-sm font-semibold text-ink-strong leading-snug">{fechaRelativa(stats.ultimaVisita)}</p>
              <p className="text-2xs text-ink-muted mt-1.5">Última visita</p>
            </div>
            {stats.servicioFrecuente && (
              <div className="rounded-xl bg-surface-bg border border-border-subtle p-3.5 col-span-2">
                <p className="text-2xs text-ink-muted mb-1">Servicio más frecuente</p>
                <p className="text-sm font-semibold text-ink-strong">{stats.servicioFrecuente}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banner bloqueada */}
      {cliente.esta_bloqueada && cliente.motivo_bloqueo && (
        <>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-start gap-3 bg-error-light border border-error rounded-xl p-4">
            <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-xs font-semibold text-error mb-1">Motivo de bloqueo</p>
              <p className="text-sm text-ink-base leading-relaxed">{cliente.motivo_bloqueo}</p>
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-border-subtle" />

      {/* Acciones */}
      {cliente.esta_bloqueada ? (
        <button onClick={onDesbloquear} disabled={cargandoAccion}
          className="w-full py-2.5 rounded-xl border border-success text-success text-sm font-semibold bg-transparent hover:bg-success-light transition-colors cursor-pointer disabled:opacity-50">
          {cargandoAccion ? 'Desbloqueando…' : 'Desbloquear clienta'}
        </button>
      ) : (
        <button onClick={onBloquear}
          className="w-full py-2.5 rounded-xl border border-error text-error text-sm font-semibold bg-transparent hover:bg-error-light transition-colors cursor-pointer">
          Bloquear clienta
        </button>
      )}
    </div>
  );
}

// ─── TabHistorial ─────────────────────────────────────────────────────────────

function TabHistorial({ historial, cargando }: { historial: ICita[]; cargando: boolean }) {
  const [verMas, setVerMas] = useState(false);
  const visibles = verMas ? historial : historial.slice(0, 10);

  if (cargando) {
    return (
      <div className="flex flex-col gap-3 p-6">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl shimmer animate-shimmer" />)}
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <Calendar size={32} className="text-ink-subtle" strokeWidth={1} />
        <p className="text-sm text-ink-muted">Sin citas registradas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border-subtle">
        {visibles.map(cita => {
          const cfg = ESTADO_CITA_CFG[cita.estado];
          return (
            <div key={cita.id} className="flex flex-col gap-1.5 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium text-ink-strong truncate">{cita.nombre_servicio ?? 'Servicio'}</p>
                  <p className="text-xs text-ink-muted">{cita.nombre_especialista ?? '—'}</p>
                </div>
                <span className={`shrink-0 mt-0.5 py-0.5 px-2 rounded-full text-2xs font-semibold ${cfg.colorCls} ${cfg.bgCls}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-ink-subtle">{formatFechaCorta(cita.programada_en)}</p>
            </div>
          );
        })}
      </div>
      {historial.length > 10 && !verMas && (
        <button onClick={() => setVerMas(true)}
          className="mx-6 my-4 py-2.5 rounded-xl border border-border-base text-sm font-medium text-ink-muted hover:text-ink-base hover:bg-surface-bg transition-colors cursor-pointer">
          Ver {historial.length - 10} más
        </button>
      )}
    </div>
  );
}

// ─── TabSalud ─────────────────────────────────────────────────────────────────

interface TabSaludProps {
  clienteId: string;
  fichas: IFichaSalud[];
  cargando: boolean;
  onFichaAgregada: (f: IFichaSalud) => void;
  onToast: (tipo: 'success' | 'error', texto: string) => void;
}

function TabSalud({ clienteId, fichas, cargando, onFichaAgregada, onToast }: TabSaludProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<IFichaSaludCreate>({ tipo_restriccion: '', descripcion: '', severidad: 'informativa' });
  const [errores, setErrores] = useState<Partial<Record<keyof IFichaSaludCreate, string>>>({});

  const validar = () => {
    const e: Partial<Record<keyof IFichaSaludCreate, string>> = {};
    if (!form.tipo_restriccion.trim()) e.tipo_restriccion = 'Requerido';
    if (!form.descripcion.trim()) e.descripcion = 'Requerido';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const nueva = await clientesService.agregarFicha(clienteId, form);
      onFichaAgregada(nueva);
      setMostrarForm(false);
      setForm({ tipo_restriccion: '', descripcion: '', severidad: 'informativa' });
      onToast('success', 'Restricción agregada');
    } catch {
      onToast('error', 'Error al agregar la restricción');
    } finally {
      setGuardando(false);
    }
  };

  const cancelarForm = () => {
    setMostrarForm(false);
    setForm({ tipo_restriccion: '', descripcion: '', severidad: 'informativa' });
    setErrores({});
  };

  if (cargando) {
    return (
      <div className="flex flex-col gap-3 p-6">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-xl shimmer animate-shimmer" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 p-6">
      {fichas.length === 0 && !mostrarForm && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <HeartPulse size={28} className="text-ink-subtle" strokeWidth={1} />
          <p className="text-sm text-ink-muted">Sin restricciones de salud</p>
        </div>
      )}

      {fichas.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {fichas.map(ficha => {
            const sev = (ficha.severidad as SeveridadFicha) in SEVERIDAD_CFG
              ? (ficha.severidad as SeveridadFicha)
              : 'informativa';
            const cfg = SEVERIDAD_CFG[sev];
            return (
              <div key={ficha.id} className={`flex flex-col gap-2 p-4 rounded-xl border ${cfg.bgCls} ${cfg.borderCls}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-strong">{ficha.tipo_restriccion}</p>
                  <span className={`shrink-0 py-0.5 px-2 rounded-full text-2xs font-semibold ${cfg.colorCls} bg-white/60`}>
                    {cfg.label}
                  </span>
                </div>
                {sev === 'critica' && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-error shrink-0" strokeWidth={2} />
                    <span className="text-2xs font-semibold text-error">Restricción crítica</span>
                  </div>
                )}
                <p className="text-sm text-ink-base leading-relaxed">{ficha.descripcion}</p>
              </div>
            );
          })}
        </div>
      )}

      {mostrarForm ? (
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border-base bg-surface-bg">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nueva restricción</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-base">Tipo de restricción</label>
            <input
              value={form.tipo_restriccion}
              onChange={e => { setForm(p => ({ ...p, tipo_restriccion: e.target.value })); if (errores.tipo_restriccion) setErrores(p => ({ ...p, tipo_restriccion: undefined })); }}
              placeholder="Ej: Alergia a tintes"
              className={`px-3 py-2 rounded-lg border text-sm text-ink-base bg-white outline-none transition-colors ${errores.tipo_restriccion ? 'border-error' : 'border-border-base focus:border-accent'}`}
            />
            {errores.tipo_restriccion && <p className="text-xs text-error">{errores.tipo_restriccion}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-base">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => { setForm(p => ({ ...p, descripcion: e.target.value })); if (errores.descripcion) setErrores(p => ({ ...p, descripcion: undefined })); }}
              placeholder="Describe la restricción con detalle…"
              rows={3}
              className={`px-3 py-2 rounded-lg border text-sm text-ink-base bg-white outline-none resize-none leading-relaxed transition-colors ${errores.descripcion ? 'border-error' : 'border-border-base focus:border-accent'}`}
            />
            {errores.descripcion && <p className="text-xs text-error">{errores.descripcion}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-base">Severidad</label>
            <div className="flex gap-2">
              {(['informativa', 'moderada', 'critica'] as SeveridadFicha[]).map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, severidad: s }))}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    form.severidad === s
                      ? `${SEVERIDAD_CFG[s].colorCls} ${SEVERIDAD_CFG[s].bgCls} ${SEVERIDAD_CFG[s].borderCls}`
                      : 'border-border-base text-ink-muted bg-white hover:bg-surface-bg'
                  }`}>
                  {SEVERIDAD_CFG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={cancelarForm}
              className="flex-1 py-2 rounded-lg border border-border-base text-sm font-medium text-ink-muted bg-white cursor-pointer hover:bg-surface-bg transition-colors">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando}
              className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold border-none cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setMostrarForm(true)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border-base text-sm font-medium text-ink-muted hover:text-ink-base hover:border-border-strong hover:bg-surface-bg transition-colors cursor-pointer">
          <Plus size={14} strokeWidth={2} />
          Agregar restricción
        </button>
      )}
    </div>
  );
}

// ─── TabNotas ─────────────────────────────────────────────────────────────────

interface TabNotasProps {
  clienteId: string;
  notasIniciales: string | null;
  onActualizado: (notas: string) => void;
  onToast: (tipo: 'success' | 'error', texto: string) => void;
}

function TabNotas({ clienteId, notasIniciales, onActualizado, onToast }: TabNotasProps) {
  const [notas, setNotas] = useState(notasIniciales ?? '');
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'guardado'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleChange = (val: string) => {
    setNotas(val);
    setEstado('guardando');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await clientesService.actualizar(clienteId, { notas_internas: val });
        setEstado('guardado');
        onActualizado(val);
        setTimeout(() => setEstado('idle'), 2500);
      } catch {
        setEstado('idle');
        onToast('error', 'Error al guardar notas');
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between h-4">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Notas internas</p>
        {estado !== 'idle' && (
          <p className="text-xs text-ink-subtle">
            {estado === 'guardando' ? 'Guardando…' : 'Guardado ✓'}
          </p>
        )}
      </div>
      <textarea
        value={notas}
        onChange={e => handleChange(e.target.value)}
        placeholder="Notas internas sobre la clienta…"
        className="min-h-[220px] px-3 py-3 rounded-xl border border-border-base bg-surface-bg text-sm text-ink-base outline-none resize-none leading-relaxed focus:border-accent transition-colors"
      />
    </div>
  );
}

// ─── PanelPerfil ──────────────────────────────────────────────────────────────

interface PanelPerfilProps {
  cliente: ICliente;
  historial: ICita[];
  fichas: IFichaSalud[];
  cargandoDatos: boolean;
  cargandoAccion: boolean;
  onCerrar: () => void;
  onBloquear: () => void;
  onDesbloquear: () => Promise<void>;
  onFichaAgregada: (f: IFichaSalud) => void;
  onActualizarNotas: (notas: string) => void;
  onActualizarDatos: (datos: { nombre_completo?: string; telefono?: string | null }) => Promise<void>;
  onToast: (tipo: 'success' | 'error', texto: string) => void;
}

function PanelPerfil({
  cliente, historial, fichas, cargandoDatos, cargandoAccion,
  onCerrar, onBloquear, onDesbloquear, onFichaAgregada, onActualizarNotas, onActualizarDatos, onToast,
}: PanelPerfilProps) {
  const [tabActiva, setTabActiva] = useState<TabPanel>('perfil');

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-modal-backdrop"
        onClick={onCerrar}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: EASE }}
        className="fixed inset-y-0 right-0 w-[520px] bg-surface-raised flex flex-col z-modal shadow-modal"
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-border-base shrink-0">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold shrink-0 ${
            cliente.esta_bloqueada ? 'bg-error-light text-error' : 'bg-accent-subtle text-accent'
          }`}>
            {iniciales(cliente.nombre_completo)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="text-xl font-semibold text-ink-strong truncate">{cliente.nombre_completo ?? '—'}</h2>
              <BadgeEstado bloqueada={cliente.esta_bloqueada} />
            </div>
            {cliente.correo && <p className="text-sm text-ink-muted truncate">{cliente.correo}</p>}
          </div>
          <button onClick={onCerrar}
            className="mt-0.5 w-8 h-8 rounded-lg border border-border-base flex items-center justify-center text-ink-muted hover:text-ink-strong cursor-pointer transition-colors shrink-0">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-base shrink-0 px-2">
          {TABS_PANEL.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTabActiva(id)}
              className={`flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors ${
                tabActiva === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-base'
              }`}>
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tabActiva === 'perfil' && (
            <TabPerfilContent
              cliente={cliente}
              historial={historial}
              cargandoDatos={cargandoDatos}
              cargandoAccion={cargandoAccion}
              onBloquear={onBloquear}
              onDesbloquear={onDesbloquear}
              onActualizarDatos={onActualizarDatos}
              onToastPerfil={onToast}
            />
          )}
          {tabActiva === 'historial' && (
            <TabHistorial historial={historial} cargando={cargandoDatos} />
          )}
          {tabActiva === 'salud' && (
            <TabSalud
              clienteId={cliente.id}
              fichas={fichas}
              cargando={cargandoDatos}
              onFichaAgregada={onFichaAgregada}
              onToast={onToast}
            />
          )}
          {tabActiva === 'notas' && (
            <TabNotas
              clienteId={cliente.id}
              notasIniciales={cliente.notas_internas}
              onActualizado={onActualizarNotas}
              onToast={onToast}
            />
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

// ─── ClientesPage ─────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ICliente | null>(null);
  const [historial, setHistorial] = useState<ICita[]>([]);
  const [fichas, setFichas] = useState<IFichaSalud[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const [panelBloqueoAbierto, setPanelBloqueoAbierto] = useState(false);
  const [cargandoBloqueo, setCargandoBloqueo] = useState(false);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [cacheVisitas, setCacheVisitas] = useState<Record<string, CacheCliente>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // ─── Toasts ────────────────────────────────────────────────────────────────

  const agregarToast = (tipo: ToastMsg['tipo'], texto: string) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, tipo, texto }]);
  };

  const quitarToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  // ─── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await clientesService.obtenerClientes();
        if (!cancelled) setClientes(data);
      } catch {
        if (!cancelled) agregarToast('error', 'Error al cargar las clientas');
      } finally {
        if (!cancelled) setCargando(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Búsqueda con debounce ─────────────────────────────────────────────────

  const handleBusqueda = (val: string) => {
    setBusquedaInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBusqueda(val), 300);
  };

  // ─── Lista filtrada ────────────────────────────────────────────────────────

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return clientes.filter(c => {
      const coincide = !q
        || c.nombre_completo?.toLowerCase().includes(q)
        || c.telefono?.includes(q)
        || c.correo?.toLowerCase().includes(q);
      const porEstado =
        filtro === 'todas' ||
        (filtro === 'activa' && !c.esta_bloqueada) ||
        (filtro === 'bloqueada' && c.esta_bloqueada);
      return coincide && porEstado;
    });
  }, [clientes, busqueda, filtro]);

  // ─── Panel perfil ──────────────────────────────────────────────────────────

  const abrirPanel = async (cliente: ICliente) => {
    setClienteSeleccionado(cliente);
    setHistorial([]);
    setFichas([]);
    setPanelAbierto(true);
    setCargandoDatos(true);
    try {
      const [hist, fichs] = await Promise.all([
        clientesService.obtenerHistorial(cliente.id),
        clientesService.obtenerFichas(cliente.id),
      ]);
      setHistorial(hist);
      setFichas(fichs);
      const completadas = [...hist.filter(c => c.estado === 'completada')]
        .sort((a, b) => new Date(b.programada_en).getTime() - new Date(a.programada_en).getTime());
      setCacheVisitas(prev => ({
        ...prev,
        [cliente.id]: { ultimaVisita: completadas[0]?.programada_en ?? null, totalVisitas: completadas.length },
      }));
    } catch {
      agregarToast('error', 'Error al cargar datos de la clienta');
    } finally {
      setCargandoDatos(false);
    }
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setPanelBloqueoAbierto(false);
    setTimeout(() => setClienteSeleccionado(null), 350);
  };

  // ─── Bloquear / desbloquear ────────────────────────────────────────────────

  const confirmarBloqueo = async (motivo: string) => {
    if (!clienteSeleccionado) return;
    setCargandoBloqueo(true);
    try {
      await clientesService.bloquear(clienteSeleccionado.id, motivo);
      const actualizado: ICliente = { ...clienteSeleccionado, esta_bloqueada: true, motivo_bloqueo: motivo };
      setClientes(prev => prev.map(c => c.id === actualizado.id ? actualizado : c));
      setClienteSeleccionado(actualizado);
      setPanelBloqueoAbierto(false);
      agregarToast('success', 'Clienta bloqueada');
    } catch {
      agregarToast('error', 'Error al bloquear la clienta');
    } finally {
      setCargandoBloqueo(false);
    }
  };

  const handleDesbloquear = async () => {
    if (!clienteSeleccionado) return;
    setCargandoAccion(true);
    try {
      await clientesService.desbloquear(clienteSeleccionado.id);
      const actualizado: ICliente = { ...clienteSeleccionado, esta_bloqueada: false, motivo_bloqueo: null };
      setClientes(prev => prev.map(c => c.id === actualizado.id ? actualizado : c));
      setClienteSeleccionado(actualizado);
      agregarToast('success', 'Clienta desbloqueada');
    } catch {
      agregarToast('error', 'Error al desbloquear la clienta');
    } finally {
      setCargandoAccion(false);
    }
  };

  const handleBloquearFila = (cliente: ICliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setClienteSeleccionado(cliente);
    setPanelBloqueoAbierto(true);
  };

  const handleDesbloquearFila = async (cliente: ICliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setCargandoAccion(true);
    try {
      await clientesService.desbloquear(cliente.id);
      const actualizado: ICliente = { ...cliente, esta_bloqueada: false, motivo_bloqueo: null };
      setClientes(prev => prev.map(c => c.id === actualizado.id ? actualizado : c));
      if (clienteSeleccionado?.id === cliente.id) setClienteSeleccionado(actualizado);
      agregarToast('success', 'Clienta desbloqueada');
    } catch {
      agregarToast('error', 'Error al desbloquear');
    } finally {
      setCargandoAccion(false);
    }
  };

  // ─── Callbacks panel ───────────────────────────────────────────────────────

  const handleFichaAgregada = (f: IFichaSalud) => setFichas(prev => [...prev, f]);

  const handleActualizarNotas = (notas: string) => {
    if (!clienteSeleccionado) return;
    const actualizado: ICliente = { ...clienteSeleccionado, notas_internas: notas };
    setClientes(prev => prev.map(c => c.id === actualizado.id ? actualizado : c));
    setClienteSeleccionado(actualizado);
  };

  const handleActualizarDatos = async (datos: { nombre_completo?: string; telefono?: string | null }) => {
    if (!clienteSeleccionado) return;
    const respuesta = await clientesService.actualizar(clienteSeleccionado.id, datos);
    setClientes(prev => prev.map(c => c.id === respuesta.id ? respuesta : c));
    setClienteSeleccionado(respuesta);
  };

  // ─── Counts ────────────────────────────────────────────────────────────────

  const conteoActivas    = clientes.filter(c => !c.esta_bloqueada).length;
  const conteoBloqueadas = clientes.filter(c =>  c.esta_bloqueada).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-strong tracking-tight">Clientes</h1>
            {!cargando && (
              <span className="py-0.5 px-2.5 rounded-full bg-accent-subtle text-accent text-xs font-bold">
                {clientes.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 bg-white border border-border-base rounded-lg py-2 px-3 w-[260px]">
            <Search size={13} strokeWidth={1.5} className="text-ink-subtle shrink-0" />
            <input
              value={busquedaInput}
              onChange={e => handleBusqueda(e.target.value)}
              placeholder="Nombre, teléfono o correo…"
              className="border-none bg-transparent text-sm text-ink-base outline-none w-full placeholder:text-ink-subtle"
            />
            {busquedaInput && (
              <button onClick={() => { handleBusqueda(''); setBusquedaInput(''); }}
                className="text-ink-subtle hover:text-ink-muted transition-colors cursor-pointer">
                <X size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {([
            { id: 'todas',    label: 'Todas',     count: clientes.length   },
            { id: 'activa',   label: 'Activas',   count: conteoActivas     },
            { id: 'bloqueada',label: 'Bloqueadas', count: conteoBloqueadas },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setFiltro(tab.id)}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border text-xs font-medium cursor-pointer transition-all duration-150 ${
                filtro === tab.id
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-border-subtle bg-white text-ink-muted hover:text-ink-base'
              }`}>
              {tab.label}
              {!cargando && (
                <span className={`text-2xs font-bold ${filtro === tab.id ? 'text-accent' : 'text-ink-subtle'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="grid px-5 py-3 border-b border-border-base gap-4"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 0.8fr 60px' }}>
            {['Cliente', 'Teléfono', 'Última visita', 'Visitas', 'Fidelización', 'Estado', ''].map(col => (
              <span key={col} className="text-2xs font-bold text-ink-muted uppercase tracking-[0.05em]">{col}</span>
            ))}
          </div>

          {/* Skeleton */}
          {cargando && [1, 2, 3, 4, 5, 6].map(i => <SkeletonFila key={i} />)}

          {/* Empty — sin resultados de búsqueda */}
          {!cargando && filtradas.length === 0 && busqueda && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search size={28} className="text-ink-subtle" strokeWidth={1} />
              <p className="text-sm font-medium text-ink-muted">Sin resultados para "{busqueda}"</p>
              <p className="text-xs text-ink-subtle">Prueba con otro nombre, teléfono o correo</p>
            </div>
          )}

          {/* Empty — sin clientas */}
          {!cargando && clientes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <User size={40} className="text-ink-subtle" strokeWidth={0.75} />
              <div>
                <p className="text-sm font-semibold text-ink-muted">Sin clientas registradas</p>
                <p className="text-xs text-ink-subtle mt-1">Aparecerán aquí cuando hagan su primera reserva</p>
              </div>
            </div>
          )}

          {/* Filas */}
          {!cargando && filtradas.length > 0 && (
            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
              initial="hidden"
              animate="visible"
            >
              {filtradas.map(cliente => {
                const cached = cacheVisitas[cliente.id];
                const seleccionada = clienteSeleccionado?.id === cliente.id && panelAbierto;
                return (
                  <motion.div
                    key={cliente.id}
                    variants={reducedMotion ? undefined : {
                      hidden: { opacity: 0, y: 5 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
                    }}
                    onMouseEnter={() => setHoverId(cliente.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => abrirPanel(cliente)}
                    className={`grid px-5 py-3.5 border-b border-border-subtle gap-4 items-center cursor-pointer transition-colors duration-100 ${
                      seleccionada ? 'bg-accent-subtle/50' : hoverId === cliente.id ? 'bg-accent-subtle/25' : ''
                    }`}
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 0.8fr 60px' }}
                  >
                    {/* Cliente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        cliente.esta_bloqueada ? 'bg-error-light text-error' : 'bg-accent-subtle text-accent'
                      }`}>
                        {iniciales(cliente.nombre_completo)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-strong truncate">{cliente.nombre_completo ?? '—'}</p>
                        <p className="text-xs text-ink-muted truncate mt-px">{cliente.correo ?? '—'}</p>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <span className="text-sm font-mono text-ink-base">{cliente.telefono ?? '—'}</span>

                    {/* Última visita */}
                    <span className="text-sm text-ink-muted">
                      {cached ? fechaRelativa(cached.ultimaVisita) : '—'}
                    </span>

                    {/* Visitas */}
                    <div className="flex items-center gap-1.5">
                      {cached ? (
                        <>
                          <Repeat2 size={12} className="text-ink-subtle shrink-0" strokeWidth={1.5} />
                          <span className="text-sm text-ink-base">{cached.totalVisitas}</span>
                        </>
                      ) : (
                        <span className="text-sm text-ink-muted">—</span>
                      )}
                    </div>

                    {/* Fidelización */}
                    <span className="text-sm text-ink-muted">—</span>

                    {/* Estado */}
                    <BadgeEstado bloqueada={cliente.esta_bloqueada} />

                    {/* Acciones */}
                    <div
                      className={`flex gap-1.5 transition-opacity duration-100 ${hoverId === cliente.id ? 'opacity-100' : 'opacity-0'}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        title="Ver perfil"
                        onClick={e => { e.stopPropagation(); abrirPanel(cliente); }}
                        className="w-7 h-7 rounded-lg border border-border-subtle bg-white text-ink-muted hover:text-ink-strong flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Eye size={12} strokeWidth={1.5} />
                      </button>
                      {cliente.esta_bloqueada ? (
                        <button
                          title="Desbloquear"
                          onClick={e => handleDesbloquearFila(cliente, e)}
                          className="w-7 h-7 rounded-lg border border-border-subtle bg-white text-success hover:bg-success-light flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <UserCheck size={12} strokeWidth={1.5} />
                        </button>
                      ) : (
                        <button
                          title="Bloquear"
                          onClick={e => handleBloquearFila(cliente, e)}
                          className="w-7 h-7 rounded-lg border border-border-subtle bg-white text-error hover:bg-error-light flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <ShieldOff size={12} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Panel perfil */}
      <AnimatePresence>
        {panelAbierto && clienteSeleccionado && (
          <PanelPerfil
            key={clienteSeleccionado.id}
            cliente={clienteSeleccionado}
            historial={historial}
            fichas={fichas}
            cargandoDatos={cargandoDatos}
            cargandoAccion={cargandoAccion}
            onCerrar={cerrarPanel}
            onBloquear={() => setPanelBloqueoAbierto(true)}
            onDesbloquear={handleDesbloquear}
            onFichaAgregada={handleFichaAgregada}
            onActualizarNotas={handleActualizarNotas}
            onActualizarDatos={handleActualizarDatos}
            onToast={agregarToast}
          />
        )}
      </AnimatePresence>

      {/* Panel bloqueo */}
      <AnimatePresence>
        {panelBloqueoAbierto && clienteSeleccionado && (
          <PanelBloqueo
            key="bloqueo"
            cliente={clienteSeleccionado}
            cargando={cargandoBloqueo}
            onConfirmar={confirmarBloqueo}
            onCerrar={() => setPanelBloqueoAbierto(false)}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      {createPortal(
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-toast pointer-events-none">
          <AnimatePresence>
            {toasts.map(msg => (
              <ToastItem key={msg.id} msg={msg} onClose={() => quitarToast(msg.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
