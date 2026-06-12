import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Clock,
  Phone, Plus, RefreshCw, User, X, Check, AlertCircle,
} from 'lucide-react';
import { citasService } from '@/services/citas.service';
import { personalService } from '@/services/personal.service';
import { clientesService } from '@/services/clientes.service';
import { serviciosService } from '@/services/servicios.service';
import { pagosService } from '@/services/pagos.service';
import type { ICita, EstadoCita } from '@/types/citas';
import type { IPersonal } from '@/types/personal';
import type { ICliente } from '@/types/clientes';
import type { IServicio, ISlotDisponible, ICategoria } from '@/types/servicios';
import type { MetodoPago } from '@/types/pagos';

// ─── Constantes ───────────────────────────────────────────────────────────────

const HORA_INICIO = 8;
const HORA_FIN    = 20;
const HORA_ALTURA = 64;
const GRID_TOTAL  = (HORA_FIN - HORA_INICIO) * HORA_ALTURA;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DIAS_ABR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const METODOS: MetodoPago[] = ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta'];
const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin',
  transferencia: 'Transferencia', tarjeta: 'Tarjeta',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: string; tipo: 'success' | 'error'; texto: string; }
interface Layout   { left: number; width: number; }

// ─── Helpers de tiempo ────────────────────────────────────────────────────────

function lunesDeLaSemana(ref: Date): Date {
  const s = ref.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const [y, m, d] = s.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12));
  const dow  = base.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return new Date(Date.UTC(y, m - 1, d + diff, 12));
}

function diasDeLaSemana(lunes: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(lunes.getUTCFullYear(), lunes.getUTCMonth(), lunes.getUTCDate() + i, 12))
  );
}

function fechaUTC(d: Date): string { return d.toISOString().slice(0, 10); }

function esHoy(d: Date): boolean {
  return fechaUTC(d) === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function esSemanActual(lunes: Date): boolean {
  return fechaUTC(lunes) === fechaUTC(lunesDeLaSemana(new Date()));
}

function citasDelDia(todas: ICita[], dia: Date, personalId: string): ICita[] {
  const diaStr = fechaUTC(dia);
  return todas.filter(c => {
    if (personalId !== 'todas' && c.personal_id !== personalId) return false;
    return new Date(c.programada_en).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) === diaStr;
  });
}

function citaTopPx(cita: ICita): number {
  const dt  = new Date(cita.programada_en);
  const h   = Number(dt.toLocaleString('en-CA', { hour: '2-digit', hour12: false, timeZone: 'America/Lima' }));
  const min = Number(dt.toLocaleString('en-CA', { minute: '2-digit', timeZone: 'America/Lima' }));
  return Math.max(0, (h * 60 + min - HORA_INICIO * 60) / 60 * HORA_ALTURA);
}

function citaAlturaPx(cita: ICita): number {
  const ms = new Date(cita.termina_en).getTime() - new Date(cita.programada_en).getTime();
  return Math.max(24, ms / 60000 / 60 * HORA_ALTURA);
}

function posLineaActual(): number {
  const now = new Date();
  const h   = Number(now.toLocaleString('en-CA', { hour: '2-digit', hour12: false, timeZone: 'America/Lima' }));
  const min = Number(now.toLocaleString('en-CA', { minute: '2-digit', timeZone: 'America/Lima' }));
  if (h < HORA_INICIO || h >= HORA_FIN) return -1;
  return (h * 60 + min - HORA_INICIO * 60) / 60 * HORA_ALTURA;
}

function formatHoraISO(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatMes(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

// ─── Overlap layout ───────────────────────────────────────────────────────────

function calcularLayout(citas: ICita[]): Map<string, Layout> {
  const result = new Map<string, Layout>();
  if (!citas.length) return result;

  const sorted = [...citas].sort((a, b) =>
    new Date(a.programada_en).getTime() - new Date(b.programada_en).getTime()
  );

  const grupos: ICita[][] = [];
  let grupo: ICita[] = [];
  let maxFin = new Date(0);

  for (const c of sorted) {
    const ini = new Date(c.programada_en);
    const fin = new Date(c.termina_en);
    if (!grupo.length || ini < maxFin) {
      grupo.push(c);
      if (fin > maxFin) maxFin = fin;
    } else {
      grupos.push(grupo);
      grupo = [c];
      maxFin = fin;
    }
  }
  if (grupo.length) grupos.push(grupo);

  for (const g of grupos) {
    const n = g.length;
    g.forEach((c, i) => result.set(c.id, { left: i / n * 100, width: 100 / n }));
  }
  return result;
}

// ─── BadgeEstado ──────────────────────────────────────────────────────────────

const ESTADO_VARS: Record<EstadoCita, { bg: string; color: string; label: string }> = {
  pendiente:        { bg: 'var(--estado-pendiente-bg)',         color: 'var(--estado-pendiente)',        label: 'Pendiente' },
  confirmada:       { bg: 'var(--estado-confirmada-bg)',        color: 'var(--estado-confirmada)',       label: 'Confirmada' },
  en_curso:         { bg: 'var(--estado-en-curso-bg)',          color: 'var(--estado-en-curso)',         label: 'En curso' },
  completada:       { bg: 'var(--estado-completada-bg)',        color: 'var(--estado-completada)',       label: 'Completada' },
  cancelada:        { bg: 'var(--estado-cancelada-bg)',         color: 'var(--estado-cancelada)',        label: 'Cancelada' },
  cancelada_tardia: { bg: 'var(--estado-cancelada-tardia-bg)', color: 'var(--estado-cancelada-tardia)', label: 'Cancel. tardía' },
  no_show:          { bg: 'var(--estado-no-show-bg)',           color: 'var(--estado-no-show)',          label: 'No show' },
};

function BadgeEstado({ estado }: { estado: EstadoCita }) {
  const v = ESTADO_VARS[estado] ?? ESTADO_VARS.pendiente;
  return (
    <span
      className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold tracking-[0.02em] border"
      style={{ background: v.bg, color: v.color, borderColor: `${v.color}30` }}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: v.color }} />
      {v.label}
    </span>
  );
}

// ─── BloqueCita ───────────────────────────────────────────────────────────────

function BloqueCita({ cita, layout, color, onClick }: {
  cita: ICita; layout: Layout; color: string; onClick: () => void;
}) {
  const top  = citaTopPx(cita);
  const alto = citaAlturaPx(cita);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: EASE }}
      onClick={onClick}
      className="absolute overflow-hidden cursor-pointer box-border z-[2]"
      style={{
        top,
        height: alto,
        left: `calc(${layout.left}% + 2px)`,
        width: `calc(${layout.width}% - 4px)`,
        background: `rgba(${r},${g},${b},0.13)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 6px 6px 0',
        padding: '4px 6px',
      }}
      whileHover={{ filter: 'brightness(1.1)' }}
    >
      <div
        className="text-[11px] font-bold leading-[1.2] overflow-hidden whitespace-nowrap text-ellipsis"
        style={{ color }}
      >
        {cita.nombre_cliente ?? '—'}
      </div>
      {alto > 40 && (
        <div
          className="text-[10px] mt-[2px] overflow-hidden whitespace-nowrap text-ellipsis"
          style={{ color: `rgba(${r},${g},${b},0.8)` }}
        >
          {formatHoraISO(cita.programada_en)} · {cita.nombre_servicio ?? ''}
        </div>
      )}
    </motion.div>
  );
}

// ─── GrillaHoraria ────────────────────────────────────────────────────────────

function GrillaHoraria({ dias, citas, personal, personalFiltro, semanaBase, dir, onCitaClick }: {
  dias: Date[];
  citas: ICita[];
  personal: IPersonal[];
  personalFiltro: string;
  semanaBase: Date;
  dir: 1 | -1;
  onCitaClick: (c: ICita) => void;
}) {
  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    personal.forEach(p => m.set(p.id, p.color_agenda));
    return m;
  }, [personal]);

  const [lineaPos, setLineaPos] = useState(posLineaActual);
  useEffect(() => {
    const id = setInterval(() => setLineaPos(posLineaActual()), 30_000);
    return () => clearInterval(id);
  }, []);

  const mostrarLinea = esSemanActual(semanaBase) && lineaPos >= 0;
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => i + HORA_INICIO);

  return (
    <div className="flex flex-1 w-full">
      {/* Eje de horas */}
      <div className="w-[52px] shrink-0 relative" style={{ height: GRID_TOTAL }}>
        {horas.map(h => (
          <div key={h} className="absolute right-2 text-[10px] text-ink-subtle tabular-nums" style={{
            top: (h - HORA_INICIO) * HORA_ALTURA - 8,
          }}>
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Columnas animadas */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={fechaUTC(semanaBase)}
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: `${d * 24}%`, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit:  (d: number) => ({ x: `${-d * 24}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: EASE }}
          className="grid grid-cols-7 flex-1 relative border-l border-border-subtle"
          style={{ height: GRID_TOTAL }}
        >
          {/* Líneas horizontales por hora */}
          {horas.map(h => (
            <div key={h} className="absolute left-0 right-0 h-px bg-border-subtle z-0 pointer-events-none" style={{
              top: (h - HORA_INICIO) * HORA_ALTURA,
            }} />
          ))}

          {/* Línea de tiempo actual */}
          {mostrarLinea && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-accent z-[3] rounded-[1px] pointer-events-none"
              style={{ top: lineaPos }}
            >
              <div className="absolute -left-1 -top-1 w-[10px] h-[10px] rounded-full bg-accent" />
            </div>
          )}

          {/* Columnas de días */}
          {dias.map((dia) => {
            const citasDia = citasDelDia(citas, dia, personalFiltro);
            const layout   = calcularLayout(citasDia);
            return (
              <div
                key={fechaUTC(dia)}
                className="relative border-r border-border-subtle"
                style={{
                  height: GRID_TOTAL,
                  background: esHoy(dia) ? 'oklch(0.95 0.02 270 / 0.25)' : 'transparent',
                }}
              >
                {citasDia.map(c => (
                  <BloqueCita
                    key={c.id}
                    cita={c}
                    layout={layout.get(c.id) ?? { left: 0, width: 100 }}
                    color={colorMap.get(c.personal_id) ?? '#7C3AED'}
                    onClick={() => onCitaClick(c)}
                  />
                ))}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── PanelDetalleCita ─────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-[10px]">
      <div className="mt-[2px] shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] text-ink-subtle font-medium uppercase tracking-[0.06em]">{label}</div>
        <div className="text-[13px] text-ink-base mt-[1px]">{value}</div>
      </div>
    </div>
  );
}

function AccionBtn({ children, color, outline = false, onClick, disabled }: {
  children: React.ReactNode; color: string;
  outline?: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-[10px] rounded-[10px] text-[13px] font-semibold transition-opacity"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...(outline
          ? { background: 'none', border: `1px solid ${color}`, color }
          : { background: color, border: 'none', color: 'white' }),
      }}
    >
      {children}
    </button>
  );
}

function PanelDetalleCita({ cita: citaInicial, personal, onClose, onActualizado }: {
  cita: ICita;
  personal: IPersonal[];
  onClose: () => void;
  onActualizado: (c: ICita) => void;
}) {
  const [cita, setCita]                   = useState(citaInicial);
  const [cargando, setCargando]           = useState(false);
  const [fichasCriticas, setFichasCriticas] = useState<{ descripcion: string }[] | null>(null);
  const [toastLocal, setToastLocal]       = useState<string | null>(null);

  const esp   = personal.find(p => p.id === cita.personal_id);
  const color = esp?.color_agenda ?? '#7C3AED';
  const esFinal = ['cancelada', 'cancelada_tardia', 'no_show', 'completada'].includes(cita.estado);

  function localToast(msg: string) {
    setToastLocal(msg);
    setTimeout(() => setToastLocal(null), 3000);
  }

  async function cambiarEstado(estado: EstadoCita, confirmar_ficha_critica = false) {
    setCargando(true);
    try {
      const actualizada = await citasService.cambiarEstado(cita.id, { estado, confirmar_ficha_critica });
      setCita(actualizada);
      onActualizado(actualizada);
      setFichasCriticas(null);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: { codigo?: string; fichas?: { descripcion: string }[] } } } })?.response?.data?.detail;
      if (detail?.codigo === 'FICHA_CRITICA') {
        setFichasCriticas(detail.fichas ?? []);
      } else {
        const msg = typeof detail === 'string' ? detail : 'Error al cambiar estado';
        localToast(msg);
      }
    } finally {
      setCargando(false);
    }
  }

  async function cancelarCita() {
    setCargando(true);
    try {
      const actualizada = await citasService.cancelar(cita.id);
      setCita(actualizada);
      onActualizado(actualizada);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      localToast(typeof msg === 'string' ? msg : 'Error al cancelar');
    } finally {
      setCargando(false);
    }
  }

  return createPortal(
    <>
      <motion.div
        key="det-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-[400]"
        style={{ background: 'oklch(0.05 0 0 / 0.3)' }}
      />
      <motion.div
        key="det-panel"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: EASE }}
        className="fixed top-0 right-0 bottom-0 w-[460px] bg-surface-bg z-[401] flex flex-col border-l border-border-subtle"
        style={{ boxShadow: '-4px 0 32px oklch(0.05 0 0 / 0.16)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 shrink-0 border-b border-border-subtle"
          style={{ background: `linear-gradient(135deg, ${color}10 0%, transparent 55%)` }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] text-ink-muted font-medium uppercase tracking-[0.08em] mb-1">Detalle de cita</div>
              <h2 className="m-0 text-lg font-bold text-ink-strong tracking-tight">{cita.nombre_cliente ?? '—'}</h2>
            </div>
            <button
              onClick={onClose}
              className="bg-transparent border border-border-base rounded-lg w-8 h-8 cursor-pointer flex items-center justify-center text-ink-muted"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div className="flex items-center gap-[10px]">
            <BadgeEstado estado={cita.estado} />
            {cita.penalizacion_aplicada && (
              <span className="text-[10px] font-semibold tracking-[0.03em]" style={{ color: 'var(--estado-cancelada-tardia)' }}>Penalización aplicada</span>
            )}
          </div>

          <div className="flex flex-col gap-[14px]">
            <InfoRow
              icon={<Calendar size={13} strokeWidth={2} color="var(--ink-muted)" />}
              label="Fecha"
              value={new Date(cita.programada_en).toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            />
            <InfoRow
              icon={<Clock size={13} strokeWidth={2} color="var(--ink-muted)" />}
              label="Horario"
              value={`${formatHoraISO(cita.programada_en)} – ${formatHoraISO(cita.termina_en)}`}
            />
            <InfoRow
              icon={<div className="w-[13px] h-[13px] rounded-full" style={{ background: color }} />}
              label="Especialista"
              value={cita.nombre_especialista ?? esp?.nombre_completo ?? '—'}
            />
            <InfoRow
              icon={<User size={13} strokeWidth={2} color="var(--ink-muted)" />}
              label="Servicio"
              value={cita.nombre_servicio ?? '—'}
            />
            {cita.hora_llegada_real && (
              <InfoRow
                icon={<Check size={13} strokeWidth={2} color="var(--ink-muted)" />}
                label="Hora de llegada"
                value={formatHoraISO(cita.hora_llegada_real)}
              />
            )}
            {cita.notas_cliente && (
              <InfoRow
                icon={<User size={13} strokeWidth={2} color="var(--ink-muted)" />}
                label="Nota del cliente"
                value={cita.notas_cliente}
              />
            )}
          </div>

          {/* Fichas críticas */}
          <AnimatePresence>
            {fichasCriticas && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-[14px_16px] rounded-[10px]"
                style={{ background: 'oklch(0.97 0.04 22)', border: '1px solid oklch(0.88 0.1 22)' }}
              >
                <div className="flex gap-2 items-start mb-[10px]">
                  <AlertCircle size={14} color="oklch(0.55 0.2 22)" strokeWidth={2} className="shrink-0 mt-[1px]" />
                  <div>
                    <p className="m-0 text-[12px] font-bold" style={{ color: 'oklch(0.5 0.2 22)' }}>Ficha de salud crítica</p>
                    <p className="m-0 mt-[2px] text-[11px]" style={{ color: 'oklch(0.55 0.15 22)' }}>El especialista debe revisar antes de iniciar</p>
                  </div>
                </div>
                {fichasCriticas.map((f, i) => (
                  <div key={i} className="text-[11px] mb-1 pl-[22px]" style={{ color: 'oklch(0.45 0.15 22)' }}>• {f.descripcion}</div>
                ))}
                <div className="flex gap-2 mt-3 pl-[22px]">
                  <button
                    onClick={() => cambiarEstado('en_curso', true)}
                    className="px-[14px] py-[6px] rounded-lg text-[11px] font-semibold cursor-pointer border-none"
                    style={{ background: 'oklch(0.88 0.12 22)', color: 'oklch(0.4 0.18 22)' }}
                  >
                    Ya fue informada — Continuar
                  </button>
                  <button
                    onClick={() => setFichasCriticas(null)}
                    className="px-[14px] py-[6px] rounded-lg text-[11px] font-medium cursor-pointer bg-transparent border border-border-base text-ink-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error inline */}
          <AnimatePresence>
            {toastLocal && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-[14px] py-[10px] rounded-[10px] text-[12px] font-medium flex items-center gap-2"
                style={{ background: 'oklch(0.97 0.03 22)', border: '1px solid oklch(0.88 0.08 22)', color: 'oklch(0.5 0.18 22)' }}
              >
                <AlertCircle size={13} strokeWidth={2} /> {toastLocal}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Acciones */}
        {!esFinal && !fichasCriticas && (
          <div className="px-6 py-4 border-t border-border-subtle shrink-0 flex flex-col gap-2">
            {cita.estado === 'pendiente' && (
              <AccionBtn color="var(--accent)" onClick={() => cambiarEstado('confirmada')} disabled={cargando}>
                Confirmar cita
              </AccionBtn>
            )}
            {cita.estado === 'confirmada' && (
              <AccionBtn color="var(--estado-en-curso)" onClick={() => cambiarEstado('en_curso')} disabled={cargando}>
                Registrar llegada
              </AccionBtn>
            )}
            {cita.estado === 'en_curso' && (
              <AccionBtn color="var(--estado-completada)" onClick={() => cambiarEstado('completada')} disabled={cargando}>
                Completar cita
              </AccionBtn>
            )}
            {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
              <AccionBtn color="var(--estado-cancelada)" outline onClick={cancelarCita} disabled={cargando}>
                Cancelar cita
              </AccionBtn>
            )}
          </div>
        )}
      </motion.div>
    </>,
    document.body
  );
}

// ─── CalMinimo ────────────────────────────────────────────────────────────────

function CalMinimo({ selected, onSelect }: {
  selected: string | null;
  onSelect: (fecha: string) => void;
}) {
  const hoy = new Date();
  const [viewYear, setViewYear]   = useState(hoy.getFullYear());
  const [viewMonth, setViewMonth] = useState(hoy.getMonth());

  const todayStr  = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const diasEnMes = new Date(viewYear, viewMonth + 1, 0).getDate();
  const primerDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset    = primerDow === 0 ? 6 : primerDow - 1;
  const celdas    = Array.from({ length: offset + diasEnMes }, (_, i) => i - offset + 1);

  function navMes(d: 1 | -1) {
    let nm = viewMonth + d, ny = viewYear;
    if (nm < 0)  { nm = 11; ny--; }
    if (nm > 11) { nm = 0;  ny++; }
    setViewMonth(nm); setViewYear(ny);
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-[10px]">
        <button onClick={() => navMes(-1)} className="bg-transparent border-none cursor-pointer p-1 text-ink-muted">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] font-semibold text-ink-base capitalize">
          {formatMes(viewYear, viewMonth)}
        </span>
        <button onClick={() => navMes(1)} className="bg-transparent border-none cursor-pointer p-1 text-ink-muted">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[2px] text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-[9px] font-semibold text-ink-subtle py-[2px] uppercase tracking-[0.06em]">{d}</div>
        ))}
        {celdas.map((dia, idx) => {
          if (dia < 1) return <div key={idx} />;
          const ds       = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const esPasado = ds < todayStr;
          const esSel    = ds === selected;
          const esT      = ds === todayStr;
          return (
            <button
              key={idx}
              disabled={esPasado}
              onClick={() => onSelect(ds)}
              className="border-none rounded-[5px] py-1 text-[11px]"
              style={{
                background: esSel ? 'var(--accent)' : esT ? 'oklch(0.92 0.06 270)' : 'none',
                color: esSel ? 'white' : esPasado ? 'var(--ink-subtle)' : 'var(--ink-base)',
                fontWeight: (esSel || esT) ? 700 : 400,
                cursor: esPasado ? 'default' : 'pointer',
                opacity: esPasado ? 0.35 : 1,
              }}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PanelNuevaCita ───────────────────────────────────────────────────────────

function PanelNuevaCita({ personal, onClose, onCreada }: {
  personal: IPersonal[];
  onClose: () => void;
  onCreada: (c: ICita) => void;
}) {
  const [paso, setPaso]                       = useState<1 | 2 | 3>(1);
  const [clientes, setClientes]               = useState<ICliente[]>([]);
  const [servicios, setServicios]             = useState<IServicio[]>([]);
  const [categorias, setCategorias]           = useState<ICategoria[]>([]);
  const [cargandoDatos, setCargandoDatos]     = useState(true);

  const [busqueda, setBusqueda]               = useState('');
  const [clienteElegido, setClienteElegido]   = useState<ICliente | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [servicioElegido, setServicioElegido] = useState<IServicio | null>(null);

  const [personalElegido, setPersonalElegido] = useState<IPersonal | null>(null);
  const [fechaElegida, setFechaElegida]       = useState<string | null>(null);
  const [slots, setSlots]                     = useState<ISlotDisponible[]>([]);
  const [cargandoSlots, setCargandoSlots]     = useState(false);
  const [slotElegido, setSlotElegido]         = useState<string | null>(null);

  const [metodo, setMetodo]                       = useState<MetodoPago>('yape');
  const [depositoRecibido, setDepositoRecibido]   = useState(false);
  const [enviando, setEnviando]                   = useState(false);
  const [apiError, setApiError]                   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      clientesService.obtenerClientes(),
      serviciosService.obtenerServicios(),
      serviciosService.obtenerCategorias(),
    ]).then(([c, s, cat]) => {
      setClientes(c);
      setServicios(s.filter(x => x.esta_activo));
      setCategorias(cat.filter(x => x.esta_activo));
    }).finally(() => setCargandoDatos(false));
  }, []);

  useEffect(() => {
    if (!servicioElegido || !personalElegido || !fechaElegida) return;
    setCargandoSlots(true);
    setSlotElegido(null);
    serviciosService.obtenerDisponibilidad(servicioElegido.id, fechaElegida)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setCargandoSlots(false));
  }, [servicioElegido, personalElegido, fechaElegida]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return [];
    return clientes.filter(c =>
      c.nombre_completo?.toLowerCase().includes(q) || c.telefono?.includes(q)
    ).slice(0, 6);
  }, [busqueda, clientes]);

  const slotsEsp = useMemo(() =>
    slots.find(s => s.personal_id === personalElegido?.id)?.horarios ?? [],
    [slots, personalElegido]
  );

  const serviciosFiltrados = useMemo(() =>
    servicios.filter(s => !categoriaActiva || s.categoria_id === categoriaActiva),
    [servicios, categoriaActiva]
  );

  async function confirmar() {
    if (!clienteElegido || !servicioElegido || !personalElegido || !slotElegido) return;
    setEnviando(true); setApiError(null);
    try {
      const cita = await citasService.crearCitaAdmin({
        cliente_id: clienteElegido.id,
        personal_id: personalElegido.id,
        servicio_ids: [servicioElegido.id],
        programada_en: slotElegido,
      });
      if (servicioElegido.monto_deposito > 0) {
        const pago = await pagosService.crear({
          cita_id: cita.id, tipo: 'deposito', metodo, monto: servicioElegido.monto_deposito,
        });
        if (depositoRecibido && metodo === 'efectivo') {
          await pagosService.confirmar(pago.id, {});
        }
      }
      onCreada(cita);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setApiError(typeof msg === 'string' ? msg : 'Error al crear la cita');
    } finally {
      setEnviando(false);
    }
  }

  const paso1Ok = Boolean(clienteElegido && servicioElegido);
  const paso2Ok = Boolean(personalElegido && fechaElegida && slotElegido);

  const PASOS = ['Cliente y servicio', 'Horario', 'Confirmar'];

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-[400]"
        style={{ background: 'oklch(0.05 0 0 / 0.3)' }}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={e => e.stopPropagation()}
        className="fixed top-0 right-0 bottom-0 w-[520px] bg-surface-bg z-[401] flex flex-col border-l border-border-subtle"
        style={{ boxShadow: '-4px 0 32px oklch(0.05 0 0 / 0.16)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 shrink-0 border-b border-border-subtle flex justify-between items-center">
          <h2 className="m-0 text-base font-bold text-ink-strong tracking-tight">Nueva cita</h2>
          <button
            onClick={onClose}
            className="bg-transparent border border-border-base rounded-lg w-8 h-8 cursor-pointer flex items-center justify-center text-ink-muted"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-[14px] border-b border-border-subtle shrink-0">
          {PASOS.map((label, i) => {
            const n = i + 1; const c = n < paso; const a = n === paso;
            return (
              <div key={i} className="flex items-center" style={{ flex: i < 2 ? 1 : undefined }}>
                <div className="flex items-center gap-[6px]">
                  <div className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold" style={{
                    background: c ? 'var(--estado-completada)' : a ? 'var(--accent)' : 'var(--border-base)',
                    color: (c || a) ? 'white' : 'var(--ink-muted)',
                  }}>
                    {c ? '✓' : n}
                  </div>
                  <span className="text-[11px] whitespace-nowrap" style={{
                    fontWeight: a ? 600 : 400,
                    color: a ? 'var(--ink-strong)' : 'var(--ink-muted)',
                  }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border-subtle mx-2" />}
              </div>
            );
          })}
        </div>

        {/* Cuerpo */}
        {cargandoDatos ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={20} color="var(--ink-muted)" className="animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ── PASO 1 ── */}
              {paso === 1 && (
                <motion.div key="p1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="px-6 py-5 flex flex-col gap-6"
                >
                  {/* Cliente */}
                  <div>
                    <SLabel>Cliente</SLabel>
                    {clienteElegido ? (
                      <div
                        className="flex items-center justify-between px-[14px] py-[10px] rounded-[10px] border-[1.5px] border-accent"
                        style={{ background: 'oklch(0.95 0.05 270)' }}
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-ink-strong">{clienteElegido.nombre_completo ?? '—'}</div>
                          {clienteElegido.telefono && (
                            <div className="text-[11px] text-ink-muted flex items-center gap-1 mt-[2px]">
                              <Phone size={10} strokeWidth={2} />{clienteElegido.telefono}
                            </div>
                          )}
                        </div>
                        <button onClick={() => setClienteElegido(null)} className="bg-transparent border-none cursor-pointer text-ink-muted p-1">
                          <X size={13} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                          placeholder="Buscar por nombre o teléfono…"
                          className="w-full px-[14px] py-[10px] rounded-[10px] border border-border-base text-[13px] text-ink-base bg-surface-bg outline-none box-border"
                          autoFocus
                        />
                        {clientesFiltrados.length > 0 && (
                          <div
                            className="absolute top-full left-0 right-0 z-10 bg-surface-bg border border-border-base rounded-[10px] mt-1 overflow-hidden"
                            style={{ boxShadow: '0 4px 24px oklch(0.05 0 0 / 0.12)' }}
                          >
                            {clientesFiltrados.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setClienteElegido(c); setBusqueda(''); }}
                                className="w-full px-[14px] py-[10px] bg-transparent border-none border-b border-border-subtle cursor-pointer text-left"
                              >
                                <div className="text-[13px] font-semibold text-ink-strong">{c.nombre_completo ?? '—'}</div>
                                {c.telefono && <div className="text-[11px] text-ink-muted">{c.telefono}</div>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Servicio */}
                  <div>
                    <SLabel>Servicio</SLabel>
                    <div className="flex gap-[6px] flex-wrap mb-3">
                      <FilterChip activo={!categoriaActiva} onClick={() => setCategoriaActiva(null)}>Todos</FilterChip>
                      {categorias.map(cat => (
                        <FilterChip key={cat.id} activo={categoriaActiva === cat.id} onClick={() => setCategoriaActiva(cat.id)}>{cat.nombre}</FilterChip>
                      ))}
                    </div>
                    <div className="flex flex-col gap-[6px] max-h-[280px] overflow-y-auto">
                      {serviciosFiltrados.map(s => {
                        const sel = servicioElegido?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setServicioElegido(s)}
                            className="flex items-center justify-between px-[14px] py-[10px] rounded-[10px] cursor-pointer w-full text-left"
                            style={{
                              background: sel ? 'oklch(0.95 0.05 270)' : 'var(--surface-bg)',
                              border: sel ? '1.5px solid var(--accent)' : '1px solid var(--border-base)',
                            }}
                          >
                            <div>
                              <div className="text-[13px] font-semibold text-ink-strong">{s.nombre}</div>
                              <div className="text-[11px] text-ink-muted mt-[1px]">{s.duracion_minutos} min</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[13px] font-bold text-ink-strong">S/ {s.precio.toFixed(0)}</div>
                              {s.monto_deposito > 0 && <div className="text-[10px] text-ink-muted">Depósito S/ {s.monto_deposito.toFixed(0)}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 2 ── */}
              {paso === 2 && (
                <motion.div key="p2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="px-6 py-5 flex flex-col gap-5"
                >
                  <div>
                    <SLabel>Especialista</SLabel>
                    <div className="flex flex-col gap-[6px]">
                      {personal.map(p => {
                        const sel = personalElegido?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setPersonalElegido(p); setSlotElegido(null); }}
                            className="flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] cursor-pointer w-full"
                            style={{
                              background: sel ? `${p.color_agenda}15` : 'none',
                              border: sel ? `1.5px solid ${p.color_agenda}` : '1px solid var(--border-base)',
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                              style={{ background: p.color_agenda }}
                            >
                              {(p.nombre_completo ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <div className="text-[13px] font-semibold text-ink-strong">{p.nombre_completo}</div>
                              <div className="text-[11px] text-ink-muted">{p.especialidad}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <SLabel>Fecha</SLabel>
                    <CalMinimo selected={fechaElegida} onSelect={f => { setFechaElegida(f); setSlotElegido(null); }} />
                  </div>

                  {personalElegido && fechaElegida && (
                    <div>
                      <SLabel>Hora disponible</SLabel>
                      {cargandoSlots ? (
                        <div className="flex items-center gap-2 text-ink-muted text-[12px]">
                          <RefreshCw size={13} className="animate-spin" /> Cargando disponibilidad…
                        </div>
                      ) : slotsEsp.length === 0 ? (
                        <div className="text-[12px] text-ink-muted py-2">Sin disponibilidad para esta fecha y especialista.</div>
                      ) : (
                        <div className="flex flex-wrap gap-[6px]">
                          {slotsEsp.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setSlotElegido(s.inicio)}
                              className="px-[14px] py-[7px] rounded-lg text-[12px] font-semibold cursor-pointer border-none"
                              style={{
                                background: slotElegido === s.inicio ? 'var(--accent)' : 'var(--border-subtle)',
                                color: slotElegido === s.inicio ? 'white' : 'var(--ink-base)',
                              }}
                            >
                              {formatHoraISO(s.inicio)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── PASO 3 ── */}
              {paso === 3 && servicioElegido && clienteElegido && personalElegido && slotElegido && (
                <motion.div key="p3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="px-6 py-5 flex flex-col gap-5"
                >
                  <div className="p-4 rounded-xl bg-border-subtle flex flex-col gap-[9px]">
                    <div className="text-[12px] font-bold text-ink-strong mb-[2px]">Resumen de la cita</div>
                    <SumRow label="Cliente"      value={clienteElegido.nombre_completo ?? '—'} />
                    <SumRow label="Servicio"     value={servicioElegido.nombre} />
                    <SumRow label="Especialista" value={personalElegido.nombre_completo ?? '—'} />
                    <SumRow label="Fecha"        value={new Date(slotElegido).toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' })} />
                    <SumRow label="Hora"         value={formatHoraISO(slotElegido)} />
                    <SumRow label="Precio total" value={`S/ ${servicioElegido.precio.toFixed(0)}`} />
                    {servicioElegido.monto_deposito > 0 && (
                      <SumRow label="Depósito" value={`S/ ${servicioElegido.monto_deposito.toFixed(0)}`} />
                    )}
                  </div>

                  {servicioElegido.monto_deposito > 0 && (
                    <div>
                      <SLabel>Método de depósito</SLabel>
                      <div className="flex flex-wrap gap-[6px] mb-3">
                        {METODOS.map(m => (
                          <button
                            key={m}
                            onClick={() => setMetodo(m)}
                            className="px-[14px] py-[7px] rounded-lg text-[12px] font-semibold cursor-pointer border-none"
                            style={{
                              background: metodo === m ? 'var(--accent)' : 'var(--border-subtle)',
                              color: metodo === m ? 'white' : 'var(--ink-base)',
                            }}
                          >
                            {METODO_LABEL[m]}
                          </button>
                        ))}
                      </div>
                      {metodo === 'efectivo' && (
                        <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink-base">
                          <input
                            type="checkbox"
                            checked={depositoRecibido}
                            onChange={e => setDepositoRecibido(e.target.checked)}
                            className="w-[15px] h-[15px]"
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          Depósito recibido y confirmado
                        </label>
                      )}
                    </div>
                  )}

                  {apiError && (
                    <div
                      className="px-[14px] py-[10px] rounded-[10px] text-[12px] font-medium flex items-center gap-2"
                      style={{ background: 'oklch(0.97 0.03 22)', border: '1px solid oklch(0.88 0.08 22)', color: 'oklch(0.5 0.18 22)' }}
                    >
                      <AlertCircle size={13} strokeWidth={2} /> {apiError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Navegación */}
        <div className="px-6 py-4 border-t border-border-subtle shrink-0 flex justify-between items-center">
          <button
            onClick={() => paso > 1 ? setPaso(p => (p - 1) as 1 | 2 | 3) : onClose()}
            className="px-[18px] py-[9px] rounded-[10px] text-[13px] font-semibold cursor-pointer bg-transparent border border-border-base text-ink-muted"
          >
            {paso === 1 ? 'Cancelar' : '← Atrás'}
          </button>
          {paso < 3 ? (
            <button
              disabled={(paso === 1 && !paso1Ok) || (paso === 2 && !paso2Ok)}
              onClick={() => setPaso(p => (p + 1) as 1 | 2 | 3)}
              className="px-[18px] py-[9px] rounded-[10px] text-[13px] font-semibold cursor-pointer bg-accent border-none text-white"
              style={{ opacity: ((paso === 1 && !paso1Ok) || (paso === 2 && !paso2Ok)) ? 0.45 : 1 }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              disabled={enviando}
              onClick={confirmar}
              className="px-[18px] py-[9px] rounded-[10px] text-[13px] font-semibold bg-accent border-none text-white flex items-center gap-[6px]"
              style={{ cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.6 : 1 }}
            >
              {enviando ? <><RefreshCw size={13} className="animate-spin" /> Creando…</> : 'Confirmar cita'}
            </button>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.06em] mb-2">
      {children}
    </div>
  );
}

function FilterChip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-[5px] rounded-full text-[11px] font-semibold border-none cursor-pointer"
      style={{
        background: activo ? 'var(--accent)' : 'var(--border-subtle)',
        color: activo ? 'white' : 'var(--ink-base)',
      }}
    >
      {children}
    </button>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink-strong font-semibold">{value}</span>
    </div>
  );
}

// ─── AgendaPage ───────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [semanaBase, setSemanaBase] = useState(() => lunesDeLaSemana(new Date()));
  const [dir, setDir]               = useState<1 | -1>(1);
  const [citas, setCitas]           = useState<ICita[]>([]);
  const [personal, setPersonal]     = useState<IPersonal[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [personalFiltro, setPersonalFiltro] = useState('todas');
  const [citaActiva, setCitaActiva]         = useState<ICita | null>(null);
  const [panelNueva, setPanelNueva]         = useState(false);
  const [toasts, setToasts]                 = useState<ToastMsg[]>([]);

  function addToast(tipo: 'success' | 'error', texto: string) {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, p] = await Promise.all([
        citasService.obtenerCitasAdmin(),
        personalService.obtenerPersonal(),
      ]);
      setCitas(c); setPersonal(p);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function navSemana(offset: 1 | -1) {
    setDir(offset);
    setSemanaBase(base =>
      new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offset * 7, 12))
    );
  }

  function irHoy() {
    const hoyLunes = lunesDeLaSemana(new Date());
    setDir(hoyLunes > semanaBase ? 1 : -1);
    setSemanaBase(hoyLunes);
  }

  const dias = useMemo(() => diasDeLaSemana(semanaBase), [semanaBase]);

  const tituloPeriodo = useMemo(() => {
    const ini = dias[0].toLocaleDateString('es-PE', { timeZone: 'UTC', day: 'numeric', month: 'short' });
    const fin = dias[6].toLocaleDateString('es-PE', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
    return `${ini} – ${fin}`;
  }, [dias]);

  function onCitaActualizada(actualizada: ICita) {
    setCitas(prev => prev.map(c => c.id === actualizada.id ? actualizada : c));
    setCitaActiva(actualizada);
  }

  function onCitaCreada(nueva: ICita) {
    setCitas(prev => [...prev, nueva]);
    addToast('success', 'Cita creada correctamente');
  }

  const personalActivo = personal.filter(p => p.esta_activo);

  return (
    <div className="flex flex-col h-full bg-surface-bg">

      {/* ── Encabezado ── */}
      <div className="px-7 pt-6 pb-4 shrink-0 border-b border-border-subtle">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="m-0 text-[22px] font-extrabold text-ink-strong tracking-[-0.03em]">Agenda</h1>
            <p className="m-0 mt-[2px] text-[12px] text-ink-muted">Vista semanal del salón</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cargar}
              disabled={cargando}
              className="px-[14px] py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer bg-transparent border border-border-base text-ink-muted flex items-center gap-[6px]"
            >
              <RefreshCw size={13} strokeWidth={2} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => setPanelNueva(true)}
              className="px-4 py-2 rounded-[10px] text-[12px] font-bold cursor-pointer bg-accent border-none text-white flex items-center gap-[6px]"
            >
              <Plus size={13} strokeWidth={2.5} /> Nueva cita
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => navSemana(-1)}
            className="w-[30px] h-[30px] rounded-lg border border-border-base bg-transparent cursor-pointer flex items-center justify-center text-ink-muted"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <span className="text-[13px] font-semibold text-ink-strong min-w-[200px] text-center">
            {tituloPeriodo}
          </span>
          <button
            onClick={() => navSemana(1)}
            className="w-[30px] h-[30px] rounded-lg border border-border-base bg-transparent cursor-pointer flex items-center justify-center text-ink-muted"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
          {!esSemanActual(semanaBase) && (
            <button
              onClick={irHoy}
              className="px-3 py-[5px] rounded-lg text-[11px] font-semibold cursor-pointer border border-accent text-accent"
              style={{ background: 'oklch(0.95 0.05 270)' }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* ── Filtro de especialistas ── */}
      <div className="px-7 py-[10px] border-b border-border-subtle shrink-0 flex gap-[6px] flex-wrap">
        <PillFiltro activo={personalFiltro === 'todas'} color="var(--accent)" onClick={() => setPersonalFiltro('todas')}>
          Todas
        </PillFiltro>
        {personalActivo.map(p => (
          <PillFiltro key={p.id} activo={personalFiltro === p.id} color={p.color_agenda} onClick={() => setPersonalFiltro(p.id)}>
            {p.nombre_completo ?? p.especialidad}
          </PillFiltro>
        ))}
      </div>

      {/* ── Grilla ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Cabecera de días (sticky) */}
        <div className="flex border-b border-border-base shrink-0 bg-surface-bg z-[5]">
          <div className="w-[52px] shrink-0" />
          {dias.map((dia, i) => (
            <div
              key={i}
              className="flex-1 py-[10px] px-1 text-center border-l border-border-subtle"
              style={{ background: esHoy(dia) ? 'oklch(0.94 0.03 270 / 0.5)' : 'transparent' }}
            >
              <div className="text-[10px] font-semibold text-ink-subtle uppercase tracking-[0.06em]">
                {DIAS_ABR[i]}
              </div>
              <div className="mt-[2px]" style={{
                fontSize: 16,
                fontWeight: esHoy(dia) ? 800 : 500,
                color: esHoy(dia) ? 'var(--accent)' : 'var(--ink-base)',
                letterSpacing: '-0.02em',
              }}>
                {dia.getUTCDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Zona scrollable de la grilla */}
        <div className="flex-1 overflow-y-auto flex">
          <GrillaHoraria
            dias={dias}
            citas={citas}
            personal={personal}
            personalFiltro={personalFiltro}
            semanaBase={semanaBase}
            dir={dir}
            onCitaClick={setCitaActiva}
          />
        </div>
      </div>

      {/* ── Panel detalle ── */}
      <AnimatePresence>
        {citaActiva && (
          <PanelDetalleCita
            key={citaActiva.id}
            cita={citaActiva}
            personal={personal}
            onClose={() => setCitaActiva(null)}
            onActualizado={onCitaActualizada}
          />
        )}
      </AnimatePresence>

      {/* ── Panel nueva cita ── */}
      <AnimatePresence>
        {panelNueva && (
          <PanelNuevaCita
            key="nueva"
            personal={personalActivo}
            onClose={() => setPanelNueva(false)}
            onCreada={onCitaCreada}
          />
        )}
      </AnimatePresence>

      {/* ── Toasts ── */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="px-4 py-[10px] rounded-[10px] text-[12px] font-semibold text-white flex items-center gap-2 max-w-[300px]"
                style={{
                  background: t.tipo === 'success' ? 'oklch(0.3 0.1 142)' : 'oklch(0.3 0.15 22)',
                  boxShadow: '0 4px 16px oklch(0.05 0 0 / 0.25)',
                }}
              >
                {t.tipo === 'success'
                  ? <Check size={13} strokeWidth={2.5} />
                  : <AlertCircle size={13} strokeWidth={2} />}
                {t.texto}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}

function PillFiltro({ activo, color, onClick, children }: {
  activo: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-[5px] rounded-full text-[11px] font-semibold cursor-pointer transition-all"
      style={{
        border: activo ? `1.5px solid ${color}` : '1px solid var(--border-base)',
        background: activo ? `${color}18` : 'none',
        color: activo ? color : 'var(--ink-muted)',
      }}
    >
      {children}
    </button>
  );
}
