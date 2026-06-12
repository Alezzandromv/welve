import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Plus,
  RefreshCw,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { citasService } from '@/services/citas.service';
import { pagosService } from '@/services/pagos.service';
import { personalService } from '@/services/personal.service';
import { clientesService } from '@/services/clientes.service';
import type { ICita, EstadoCita } from '@/types/citas';
import type { IPago } from '@/types/pagos';
import type { IPersonal } from '@/types/personal';
import type { IFichaSalud } from '@/types/clientes';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_LABELS: Record<EstadoCita, string> = {
  pendiente:        'Pendiente',
  confirmada:       'Confirmada',
  en_curso:         'En curso',
  completada:       'Completada',
  cancelada:        'Cancelada',
  cancelada_tardia: 'Canc. tardía',
  no_show:          'No-show',
};

const NEXT_STATES: Partial<Record<EstadoCita, EstadoCita[]>> = {
  pendiente:  ['confirmada'],
  confirmada: ['en_curso', 'cancelada'],
  en_curso:   ['completada', 'no_show'],
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function horaLima(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit',
  });
}

function obtenerSaludo(): string {
  const h = parseInt(
    new Date().toLocaleTimeString('en-CA', { hour: '2-digit', hour12: false, timeZone: 'America/Lima' }),
    10
  );
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function estadoVar(e: EstadoCita): string {
  return e.replace(/_/g, '-');
}

function formatSoles(n: number): string {
  return 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DashboardData {
  todasCitas: ICita[];
  pagosPendientes: IPago[];
  personal: IPersonal[];
  totalClientes: number;
}

// ─── Hook useDashboardData ────────────────────────────────────────────────────

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [citas, pagos, personal, clientes] = await Promise.all([
        citasService.obtenerCitasAdmin(),
        pagosService.obtenerPagosPendientes(),
        personalService.obtenerPersonal(),
        clientesService.obtenerClientes(),
      ]);
      setData({
        todasCitas: citas,
        pagosPendientes: pagos,
        personal: personal.filter(p => p.esta_activo),
        totalClientes: clientes.length,
      });
    } catch {
      setError('No se pudo cargar el dashboard. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [cargar]);

  return { data, loading, error, refetch: cargar };
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({
  target, prefix = '', duration = 600, reduced,
}: {
  target: number; prefix?: string; duration?: number; reduced: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = prefix + target.toLocaleString('es-PE');
      return;
    }
    let start: number | null = null;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el!.textContent = prefix + Math.round(target * ease).toLocaleString('es-PE');
      if (p < 1) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, prefix, reduced]);

  return <span ref={ref}>{prefix}0</span>;
}

// ─── BadgeEstado ──────────────────────────────────────────────────────────────

function BadgeEstado({ estado, size = 'md' }: { estado: EstadoCita; size?: 'sm' | 'md' }) {
  const v = estadoVar(estado);
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${size === 'sm' ? 'text-2xs px-[7px] py-[1px]' : 'text-xs px-[10px] py-[3px]'}`}
      style={{
        background: `var(--estado-${v}-bg)`,
        color: `var(--estado-${v})`,
      }}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}

// ─── PanelSeccion ─────────────────────────────────────────────────────────────

function PanelSeccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">
        {titulo}
      </div>
      {children}
    </div>
  );
}

// ─── KPI Hero ─────────────────────────────────────────────────────────────────

function KpiHero({ citas, reduced }: { citas: ICita[]; reduced: boolean }) {
  const hoy = fechaLima();
  const citasHoy    = citas.filter(c => c.programada_en.startsWith(hoy));
  const confirmadas = citasHoy.filter(c => c.estado === 'confirmada').length;
  const pendientes  = citasHoy.filter(c => c.estado === 'pendiente').length;
  const enCurso     = citasHoy.filter(c => c.estado === 'en_curso').length;
  const completadas = citasHoy.filter(c => c.estado === 'completada').length;

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-xl p-8 grid items-center relative overflow-hidden min-h-[164px]"
      style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--color-violet-700) 100%)',
        gridTemplateColumns: '1fr auto',
        boxShadow: '0 8px 32px var(--accent-glow)',
      }}
    >
      {/* Decoración de fondo */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none -top-[60px] -right-[40px] w-[200px] h-[200px]"
        style={{ background: 'oklch(0.75 0.18 286 / 0.2)' }}
      />

      {/* Izquierda */}
      <div>
        <div className="text-sm font-medium mb-2 text-white/70">
          Citas hoy
        </div>
        <div
          className="font-extrabold text-white leading-none tracking-tight"
          style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
        >
          <AnimatedCounter target={citasHoy.length} duration={600} reduced={reduced} />
        </div>
        <div className="mt-3 text-sm text-white/65">
          {confirmadas} confirmadas · {pendientes} pendientes
        </div>
      </div>

      {/* Derecha — micro stats */}
      <div className="flex flex-col items-end gap-4">
        <CalendarDays size={44} strokeWidth={1} className="text-white/15" aria-hidden />
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
              style={{ background: 'oklch(0.75 0.18 286)' }}
            />
            {enCurso} en curso
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
              style={{ background: 'oklch(0.72 0.18 152)' }}
            />
            {completadas} completadas
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, iconColor, iconBg, delay, reduced,
}: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  iconColor: string; iconBg: string; delay: number; reduced: boolean;
}) {
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      className="bg-surface-raised border border-border-subtle rounded-xl p-5 flex flex-col gap-3 shadow"
    >
      <div
        className="w-9 h-9 flex items-center justify-center rounded-[10px]"
        style={{ background: iconBg }}
      >
        <Icon size={17} strokeWidth={1.5} color={iconColor} />
      </div>
      <div>
        <div className="text-3xl font-bold text-ink-strong leading-none tracking-tight">
          <AnimatedCounter target={value} reduced={reduced} />
        </div>
        <div className="text-xs text-ink-muted mt-1">{label}</div>
        {sub && <div className="text-xs text-ink-subtle mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[52, 120, 96, 96, 68, 48].map((w, i) => (
        <td key={i} className="p-3">
          <div className="shimmer h-3.5 rounded" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── DropdownEstado ───────────────────────────────────────────────────────────

function DropdownEstado({ cita, onChange }: { cita: ICita; onChange: (s: EstadoCita) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const siguientes = NEXT_STATES[cita.estado] ?? [];

  if (siguientes.length === 0) return null;

  function abrir() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={abrir}
        className="border border-border-base bg-transparent text-ink-muted text-2xs font-medium cursor-pointer flex items-center rounded-lg px-2 py-[3px] gap-[3px]"
      >
        Estado ▾
      </button>

      {open && createPortal(
        <AnimatePresence>
          <div
            key="dd-overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-dropdown"
          />
          <motion.div
            key="dd-menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="fixed bg-surface-raised border border-border-base rounded-xl shadow-lg p-1 min-w-[140px]"
            style={{ top: pos.top, left: pos.left, zIndex: 101 }}
          >
            {siguientes.map(s => {
              const v = estadoVar(s);
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className="w-full flex items-center gap-2 rounded-lg border-none cursor-pointer text-xs font-medium text-left bg-transparent px-3 py-2"
                  style={{ color: `var(--estado-${v})` }}
                  onMouseEnter={e => { (e.currentTarget).style.background = `var(--estado-${v}-bg)`; }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 inline-block"
                    style={{ background: `var(--estado-${v})` }}
                  />
                  {ESTADO_LABELS[s]}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ─── PanelDetalle ─────────────────────────────────────────────────────────────

function PanelDetalle({
  cita, personal, onClose, onEstadoChange, reduced,
}: {
  cita: ICita;
  personal: IPersonal[];
  onClose: () => void;
  onEstadoChange: (cita: ICita, estado: EstadoCita) => void;
  reduced: boolean;
}) {
  const [pagos, setPagos] = useState<IPago[] | null>(null);
  const [fichas, setFichas] = useState<IFichaSalud[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      pagosService.obtenerPorCita(cita.id),
      clientesService.obtenerFichas(cita.cliente_id),
    ])
      .then(([p, f]) => { setPagos(p); setFichas(f); })
      .catch(() => { setPagos([]); setFichas([]); })
      .finally(() => setCargando(false));
  }, [cita.id, cita.cliente_id]);

  async function confirmarPago(pago: IPago) {
    const prev = pagos;
    setPagos(pagos?.map(p => p.id === pago.id ? { ...p, estado: 'confirmado' as const } : p) ?? null);
    try {
      await pagosService.confirmar(pago.id, {});
    } catch {
      setPagos(prev);
    }
  }

  const especialista = personal.find(p => p.id === cita.personal_id);
  const siguientes   = NEXT_STATES[cita.estado] ?? [];

  return createPortal(
    <>
      <motion.div
        key="panel-overlay"
        initial={reduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0"
        style={{ background: 'oklch(0.12 0.038 288 / 0.5)', zIndex: 399 }}
      />
      <motion.div
        key="panel"
        initial={reduced ? {} : { x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de cita de ${cita.nombre_cliente ?? 'cliente'}`}
        className="fixed top-0 right-0 bottom-0 bg-surface-raised shadow-modal flex flex-col overflow-y-auto w-[420px] max-w-full"
        style={{ zIndex: 400 }}
      >
        {/* Header sticky */}
        <div className="flex items-start justify-between p-5 border-b border-border-subtle sticky top-0 bg-surface-raised shrink-0 z-10">
          <div>
            <h2 className="m-0 text-xl font-bold text-ink-strong">
              {cita.nombre_cliente ?? 'Cliente'}
            </h2>
            <div className="mt-2">
              <BadgeEstado estado={cita.estado} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-base bg-transparent cursor-pointer text-ink-muted shrink-0"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 p-5 flex flex-col gap-5">

          {/* Cambiar estado */}
          {siguientes.length > 0 && (
            <PanelSeccion titulo="Cambiar estado">
              <div className="flex gap-2 flex-wrap">
                {siguientes.map(s => {
                  const v = estadoVar(s);
                  return (
                    <motion.button
                      key={s}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onEstadoChange(cita, s)}
                      className="text-xs font-semibold cursor-pointer rounded-lg px-3 py-2"
                      style={{
                        border: `1px solid var(--estado-${v})`,
                        background: `var(--estado-${v}-bg)`,
                        color: `var(--estado-${v})`,
                      }}
                    >
                      → {ESTADO_LABELS[s]}
                    </motion.button>
                  );
                })}
              </div>
            </PanelSeccion>
          )}

          {/* Servicio */}
          <PanelSeccion titulo="Servicio">
            <div className="font-semibold text-ink-strong text-sm">
              {cita.nombre_servicio ?? '—'}
            </div>
          </PanelSeccion>

          {/* Especialista */}
          <PanelSeccion titulo="Especialista">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: especialista?.color_agenda ?? 'var(--accent)' }}
              >
                {iniciales(cita.nombre_especialista)}
              </div>
              <div>
                <div className="font-semibold text-ink-strong text-sm">
                  {cita.nombre_especialista ?? '—'}
                </div>
                {especialista && (
                  <div className="text-xs text-ink-muted">{especialista.especialidad}</div>
                )}
              </div>
            </div>
          </PanelSeccion>

          {/* Horario */}
          <PanelSeccion titulo="Horario">
            <div className="font-semibold text-ink-strong text-sm">
              {new Date(cita.programada_en).toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima',
              })}
            </div>
            <div className="text-sm text-ink-muted mt-0.5">
              {horaLima(cita.programada_en)} — {horaLima(cita.termina_en)}
            </div>
            {cita.hora_llegada_real && (
              <div className="text-xs text-success mt-1">
                Llegó: {horaLima(cita.hora_llegada_real)}
              </div>
            )}
          </PanelSeccion>

          {/* Pagos */}
          <PanelSeccion titulo="Pagos">
            {cargando ? (
              <div className="shimmer h-3.5 rounded w-[120px]" />
            ) : pagos && pagos.length > 0 ? (
              <div className="flex flex-col gap-2">
                {pagos.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-bg"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink-strong">
                        {formatSoles(p.monto)}
                      </div>
                      <div className="text-xs text-ink-muted mt-px">
                        {p.tipo} · {p.metodo}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-2xs font-semibold rounded-full px-2 py-[2px] ${
                          p.estado === 'confirmado'
                            ? 'bg-success-light text-success'
                            : p.estado === 'pendiente'
                            ? 'bg-warning-light text-warning'
                            : 'bg-error-light text-error'
                        }`}
                      >
                        {p.estado}
                      </span>
                      {p.estado === 'pendiente' && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => confirmarPago(p)}
                          className="bg-success text-white text-2xs font-semibold cursor-pointer border-none rounded-lg px-[10px] py-[3px]"
                        >
                          Confirmar
                        </motion.button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-ink-muted">Sin pagos registrados</span>
            )}
          </PanelSeccion>

          {/* Fichas de salud */}
          {fichas && fichas.filter(f => f.esta_activo).length > 0 && (
            <PanelSeccion titulo="Salud">
              <div className="flex flex-col gap-2">
                {fichas.filter(f => f.esta_activo).map(f => {
                  const critica  = f.severidad === 'critica';
                  const moderada = f.severidad === 'moderada';
                  return (
                    <div
                      key={f.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        critica
                          ? 'border-error bg-error-light'
                          : moderada
                          ? 'border-warning bg-warning-light'
                          : 'border-info bg-info-light'
                      }`}
                    >
                      {critica && (
                        <AlertTriangle
                          size={15}
                          strokeWidth={2}
                          color="var(--error)"
                          className="shrink-0 mt-px"
                        />
                      )}
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-wide ${critica ? 'text-error-dark' : 'text-ink-strong'}`}>
                          {f.tipo_restriccion}
                        </div>
                        <div className="text-xs text-ink-base mt-0.5">{f.descripcion}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelSeccion>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  );
}

// ─── TablaHoy ─────────────────────────────────────────────────────────────────

function TablaHoy({
  citas, personal, onEstadoChange, onVerDetalle, loading, emptyMsg = 'Sin citas para hoy',
}: {
  citas: ICita[];
  personal: IPersonal[];
  onEstadoChange: (cita: ICita, estado: EstadoCita) => void;
  onVerDetalle: (cita: ICita) => void;
  loading: boolean;
  emptyMsg?: string;
}) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>{[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}</tbody>
        </table>
      </div>
    );
  }

  if (citas.length === 0) {
    return (
      <div className="flex flex-col items-center p-12 gap-3">
        <CalendarDays size={48} strokeWidth={1} className="text-ink-subtle" />
        <div className="text-sm text-ink-muted">{emptyMsg}</div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/admin/agenda')}
          className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold cursor-pointer border-none rounded-lg px-4 py-2"
        >
          <Plus size={13} strokeWidth={2} /> Crear cita
        </motion.button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {['Hora', 'Cliente', 'Servicio', 'Especialista', 'Estado', ''].map(col => (
              <th
                key={col}
                className="text-left border-b border-border-subtle text-ink-muted text-xs font-medium whitespace-nowrap px-3 py-2"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {citas.map((cita, i) => {
            const isHovered    = hoveredId === cita.id;
            const especialista = personal.find(p => p.id === cita.personal_id);
            return (
              <tr
                key={cita.id}
                onMouseEnter={() => setHoveredId(cita.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`border-b border-border-subtle transition-colors duration-[120ms] animate-fade-in-row ${
                  isHovered ? 'bg-accent-subtle' : 'bg-transparent'
                }`}
                style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}
              >
                <td className="px-3 py-3 whitespace-nowrap text-ink-strong font-semibold font-mono tabular-nums">
                  {horaLima(cita.programada_en)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent-glow flex items-center justify-center text-accent text-2xs font-bold shrink-0">
                      {iniciales(cita.nombre_cliente)}
                    </div>
                    <span className="font-medium text-ink-strong whitespace-nowrap">
                      {cita.nombre_cliente ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-base whitespace-nowrap">
                  {cita.nombre_servicio ?? '—'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 inline-block"
                      style={{ background: especialista?.color_agenda ?? 'var(--accent)' }}
                    />
                    <span className="text-ink-base whitespace-nowrap">
                      {cita.nombre_especialista ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <BadgeEstado estado={cita.estado} />
                </td>
                <td className="px-3 py-3">
                  <div
                    className={`flex items-center gap-1 transition-opacity duration-150 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <DropdownEstado cita={cita} onChange={s => onEstadoChange(cita, s)} />
                    <button
                      onClick={() => onVerDetalle(cita)}
                      aria-label="Ver detalle"
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-border-base bg-transparent cursor-pointer text-ink-muted"
                    >
                      <Eye size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── EspecialistasStrip ───────────────────────────────────────────────────────

function EspecialistasStrip({ personal, citas }: { personal: IPersonal[]; citas: ICita[] }) {
  const hoy = fechaLima();

  const nombresMap = useMemo(() => {
    const m = new Map<string, string>();
    citas.forEach(c => {
      if (c.personal_id && c.nombre_especialista && !m.has(c.personal_id))
        m.set(c.personal_id, c.nombre_especialista);
    });
    return m;
  }, [citas]);

  const citasHoy = useMemo(
    () => citas.filter(c => c.programada_en.startsWith(hoy)),
    [citas, hoy]
  );

  if (personal.length === 0) return null;

  return (
    <section>
      <h2 className="m-0 mb-4 text-xl font-semibold text-ink-strong">Equipo hoy</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {personal.map((m, i) => {
          const propias = citasHoy.filter(c => c.personal_id === m.id);
          const enCurso = propias.some(c => c.estado === 'en_curso');
          const nombre  = nombresMap.get(m.id) ?? m.especialidad;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
              className="bg-surface-raised rounded-xl border border-border-subtle overflow-hidden shadow-sm shrink-0 min-w-[160px]"
            >
              <div className="h-1" style={{ background: m.color_agenda ?? 'var(--accent)' }} />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: m.color_agenda ?? 'var(--accent)' }}
                  >
                    {iniciales(nombre)}
                  </div>
                  {enCurso && (
                    <span
                      className="w-2 h-2 rounded-full bg-success inline-block"
                      style={{ boxShadow: '0 0 0 2px var(--success-light)' }}
                    />
                  )}
                </div>
                <div className="text-sm font-semibold text-ink-strong truncate mb-0.5">
                  {nombre.split(' ')[0]}
                </div>
                <div className="text-xs text-ink-muted truncate mb-3">
                  {m.especialidad}
                </div>
                <div className="text-xs text-ink-muted">
                  {propias.length} cita{propias.length !== 1 ? 's' : ''} hoy
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

interface HoveredCell {
  fecha: string;
  rect: DOMRect;
  citas: ICita[];
}

function MiniCalendar({
  todasCitas, reduced, fechaSeleccionada, onSeleccionar,
}: {
  todasCitas: ICita[]; reduced: boolean;
  fechaSeleccionada: string; onSeleccionar: (fecha: string) => void;
}) {
  const hoyStr = fechaLima();
  const now    = new Date();
  const [mes,  setMes]  = useState(now.getMonth());
  const [año,  setAño]  = useState(now.getFullYear());
  const [dir,  setDir]  = useState<1 | -1>(1);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const citasPorFecha = useMemo(() => {
    const m = new Map<string, ICita[]>();
    todasCitas.forEach(c => {
      const d = c.programada_en.slice(0, 10);
      m.set(d, [...(m.get(d) ?? []), c]);
    });
    return m;
  }, [todasCitas]);

  function navAnterior() {
    setDir(-1);
    if (mes === 0) { setMes(11); setAño(a => a - 1); }
    else setMes(m => m - 1);
  }

  function navSiguiente() {
    setDir(1);
    if (mes === 11) { setMes(0); setAño(a => a + 1); }
    else setMes(m => m + 1);
  }

  const primerDia   = (new Date(año, mes, 1).getDay() + 6) % 7;
  const diasEnMes   = new Date(año, mes + 1, 0).getDate();
  const totalCeldas = Math.ceil((primerDia + diasEnMes) / 7) * 7;

  function onCellEnter(fecha: string, e: React.MouseEvent<HTMLDivElement>, citas: ICita[]) {
    if (citas.length === 0) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell({ fecha, rect, citas });
  }

  function onCellLeave() {
    hoverTimeout.current = setTimeout(() => setHoveredCell(null), 100);
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={navAnterior}
          aria-label="Mes anterior"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border border-border-base text-ink-muted cursor-pointer"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-base font-semibold text-ink-strong">
          {MESES_ES[mes]} {año}
        </span>
        <button
          onClick={navSiguiente}
          aria-label="Mes siguiente"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border border-border-base text-ink-muted cursor-pointer"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {DIAS_ES.map(d => (
          <div key={d} className="text-center text-2xs text-ink-subtle font-semibold">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${año}-${mes}`}
            custom={dir}
            variants={{
              enter:  (d: number) => reduced ? { opacity: 0 } : { x: `${d * 60}%`, opacity: 0 },
              center: { x: 0, opacity: 1 },
              exit:   (d: number) => reduced ? { opacity: 0 } : { x: `${-d * 60}%`, opacity: 0 },
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: EASE }}
            className="grid grid-cols-7 gap-0.5"
          >
            {Array.from({ length: totalCeldas }).map((_, idx) => {
              const numDia = idx - primerDia + 1;
              if (numDia < 1 || numDia > diasEnMes) return <div key={idx} />;
              const fStr     = `${año}-${String(mes + 1).padStart(2, '0')}-${String(numDia).padStart(2, '0')}`;
              const citasDia = citasPorFecha.get(fStr) ?? [];
              const esHoy          = fStr === hoyStr;
              const esSeleccionado = fStr === fechaSeleccionada;
              const estadosDot = [...new Set(citasDia.map(c => c.estado))].slice(0, 3);
              return (
                <div
                  key={idx}
                  onClick={() => onSeleccionar(fStr)}
                  onMouseEnter={e => onCellEnter(fStr, e, citasDia)}
                  onMouseLeave={onCellLeave}
                  className={`flex flex-col items-center justify-center min-h-[36px] rounded-lg cursor-pointer transition-[background] duration-[120ms] gap-0.5 ${
                    esSeleccionado && !esHoy
                      ? 'outline outline-2 outline-accent -outline-offset-2'
                      : ''
                  }`}
                  style={{
                    background: esHoy
                      ? 'var(--accent)'
                      : esSeleccionado
                      ? 'var(--accent-glow)'
                      : 'transparent',
                  }}
                >
                  <span
                    className={`text-xs leading-none ${
                      esHoy || esSeleccionado ? 'font-bold' : 'font-normal'
                    } ${
                      esHoy
                        ? 'text-white'
                        : esSeleccionado
                        ? 'text-accent'
                        : 'text-ink-base'
                    }`}
                  >
                    {numDia}
                  </span>
                  {estadosDot.length > 0 && (
                    <div className="flex gap-0.5">
                      {estadosDot.map(e => (
                        <span
                          key={e}
                          className="w-1 h-1 rounded-full inline-block"
                          style={{
                            background: esHoy
                              ? 'oklch(1 0 0 / 0.7)'
                              : `var(--estado-${estadoVar(e)})`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Popover portal */}
      {hoveredCell && createPortal(
        <AnimatePresence>
          <motion.div
            key="cal-popover"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: EASE }}
            onMouseEnter={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }}
            onMouseLeave={onCellLeave}
            className="fixed bg-surface-raised border border-border-base rounded-xl shadow-lg p-3 min-w-[210px] max-w-[280px] z-tooltip"
            style={{
              top: Math.min(hoveredCell.rect.top, window.innerHeight - 240),
              left: hoveredCell.rect.right + 8,
            }}
          >
            <div className="text-xs text-ink-muted mb-2">
              {new Date(hoveredCell.fecha + 'T12:00:00').toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
              })}
            </div>
            {hoveredCell.citas.slice(0, 3).map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 py-1 border-t border-border-subtle"
              >
                <span className="font-mono text-xs text-ink-muted shrink-0">
                  {horaLima(c.programada_en)}
                </span>
                <span className="text-xs text-ink-strong font-medium flex-1 truncate">
                  {c.nombre_cliente ?? '—'}
                </span>
                <BadgeEstado estado={c.estado} size="sm" />
              </div>
            ))}
            {hoveredCell.citas.length > 3 && (
              <div className="text-2xs text-ink-subtle mt-1 text-center">
                y {hoveredCell.citas.length - 3} más
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─── DashboardSkeleton ────────────────────────────────────────────────────────

function Shimmer({ h, radius = 8 }: { h: number; radius?: number }) {
  return (
    <div className="shimmer" style={{ height: h, borderRadius: radius }} />
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="grid gap-5 items-start"
      style={{ gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)' }}
    >
      <div className="flex flex-col gap-5">
        <Shimmer h={164} radius={16} />
        <div className="grid grid-cols-3 gap-4">
          <Shimmer h={112} radius={16} />
          <Shimmer h={112} radius={16} />
          <Shimmer h={112} radius={16} />
        </div>
        <Shimmer h={260} radius={16} />
      </div>
      <div className="flex flex-col gap-4">
        <Shimmer h={310} radius={16} />
        <Shimmer h={90} radius={12} />
        <Shimmer h={90} radius={12} />
      </div>
    </div>
  );
}

// ─── Dashboard (page) ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const usuario  = useAuthStore(s => s.usuario);
  const { data, loading, error, refetch } = useDashboardData();

  const reduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  const hoy       = fechaLima();
  const mesActual = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
    .slice(0, 7);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLima());

  const [filasHoy, setFilasHoy] = useState<ICita[]>([]);
  useEffect(() => {
    if (data)
      setFilasHoy(
        data.todasCitas.filter(c => c.programada_en.startsWith(fechaSeleccionada))
      );
  }, [data, fechaSeleccionada]);

  const [citaSeleccionada, setCitaSeleccionada] = useState<ICita | null>(null);

  function cambiarEstado(cita: ICita, nuevo: EstadoCita) {
    const prevFilas = filasHoy;
    const prevSel   = citaSeleccionada;
    setFilasHoy(r => r.map(c => c.id === cita.id ? { ...c, estado: nuevo } : c));
    if (citaSeleccionada?.id === cita.id)
      setCitaSeleccionada(s => s ? { ...s, estado: nuevo } : s);
    citasService.cambiarEstado(cita.id, { estado: nuevo }).catch(() => {
      setFilasHoy(prevFilas);
      setCitaSeleccionada(prevSel);
    });
  }

  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const noShowsMes = useMemo(
    () =>
      (data?.todasCitas ?? []).filter(
        c => c.estado === 'no_show' && c.programada_en.startsWith(mesActual)
      ).length,
    [data, mesActual]
  );

  const montoPendiente = useMemo(
    () => (data?.pagosPendientes ?? []).reduce((s, p) => s + p.monto, 0),
    [data]
  );

  const tituloTabla = useMemo(
    () =>
      fechaSeleccionada === hoy
        ? 'Citas de hoy'
        : new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-PE', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
          }),
    [fechaSeleccionada, hoy]
  );

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold text-ink-strong tracking-tight">
            {obtenerSaludo()}
            {usuario ? `, ${usuario.nombre_completo.split(' ')[0]}` : ''}
          </h1>
          <p className="m-0 mt-0.5 text-sm text-ink-muted">
            {new Date().toLocaleDateString('es-PE', {
              weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Actualizar"
            className="flex items-center gap-1.5 bg-surface-raised border border-border-base text-ink-muted text-xs font-medium cursor-pointer rounded-lg px-3 py-2 disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              className={refreshing || loading ? 'animate-spin' : undefined}
            />
            Actualizar
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/admin/agenda')}
            className="inline-flex items-center gap-1.5 bg-accent text-white text-sm font-semibold cursor-pointer border-none rounded-lg px-4 py-2"
          >
            <Plus size={15} strokeWidth={2} /> Nueva cita
          </motion.button>
        </div>
      </div>

      {/* Banner de error */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl bg-error-light border border-error/30 text-error text-sm px-4 py-3"
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            <span className="flex-1">{error}</span>
            <button
              onClick={refetch}
              className="flex items-center gap-1 text-error text-xs font-semibold cursor-pointer border-none rounded-lg px-[10px] py-1 bg-error/15"
            >
              <RefreshCw size={12} strokeWidth={2} /> Reintentar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {loading && !data ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DashboardSkeleton />
          </motion.div>
        ) : data ? (
          <motion.div
            key="data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {/* Grid 65/35 */}
            <div
              className="grid gap-5 items-start"
              style={{ gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)' }}
            >
              {/* Columna izquierda */}
              <div className="flex flex-col gap-5">
                <KpiHero citas={data.todasCitas} reduced={reduced} />

                <div className="grid grid-cols-3 gap-4">
                  <KpiCard
                    icon={CreditCard}
                    label="Por confirmar"
                    value={data.pagosPendientes.length}
                    sub={montoPendiente > 0 ? formatSoles(montoPendiente) : undefined}
                    iconColor="var(--success)" iconBg="var(--success-light)"
                    delay={0.04} reduced={reduced}
                  />
                  <KpiCard
                    icon={XCircle}
                    label="No-shows este mes"
                    value={noShowsMes}
                    iconColor="var(--error)" iconBg="var(--error-light)"
                    delay={0.08} reduced={reduced}
                  />
                  <KpiCard
                    icon={Users}
                    label="Total clientas"
                    value={data.totalClientes}
                    iconColor="var(--accent)" iconBg="var(--accent-glow)"
                    delay={0.12} reduced={reduced}
                  />
                </div>

                {/* Tabla de citas */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="m-0 text-xl font-semibold text-ink-strong flex items-center gap-2">
                      {tituloTabla}
                      {filasHoy.length > 0 && (
                        <span className="bg-accent-glow text-accent text-xs font-bold rounded-full px-2 py-[1px]">
                          {filasHoy.length}
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => navigate('/admin/agenda')}
                      className="bg-transparent border-none text-accent text-xs font-semibold cursor-pointer"
                    >
                      Ver agenda →
                    </button>
                  </div>
                  <div className="bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden shadow">
                    <TablaHoy
                      citas={filasHoy}
                      personal={data.personal}
                      onEstadoChange={cambiarEstado}
                      onVerDetalle={setCitaSeleccionada}
                      loading={loading}
                      emptyMsg={
                        fechaSeleccionada === hoy
                          ? 'Sin citas para hoy'
                          : 'Sin citas para esta fecha'
                      }
                    />
                  </div>
                </section>

                <EspecialistasStrip personal={data.personal} citas={data.todasCitas} />
              </div>

              {/* Columna derecha — calendario sticky */}
              <MiniCalendar
                todasCitas={data.todasCitas}
                reduced={reduced}
                fechaSeleccionada={fechaSeleccionada}
                onSeleccionar={setFechaSeleccionada}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Panel de detalle */}
      <AnimatePresence>
        {citaSeleccionada && (
          <PanelDetalle
            key={citaSeleccionada.id}
            cita={citaSeleccionada}
            personal={data?.personal ?? []}
            onClose={() => setCitaSeleccionada(null)}
            onEstadoChange={(cita, estado) => {
              cambiarEstado(cita, estado);
              setCitaSeleccionada(c => c ? { ...c, estado } : c);
            }}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </div>
  );
}