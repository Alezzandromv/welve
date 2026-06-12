import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  User,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { personalService } from '@/services/personal.service';
import type { IPersonal, IDisponibilidad, IDisponibilidadCreate } from '@/types/personal';

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLORES = [
  '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
];

const ESPECIALIDADES = [
  'Colorimetría', 'Corte', 'Tratamientos capilares',
  'Uñas', 'Pestañas y cejas', 'Manicura', 'Pedicura', 'Todas',
];

const DIAS_CONFIG = [
  { label: 'Lunes', abr: 'L', num: 1 },
  { label: 'Martes', abr: 'M', num: 2 },
  { label: 'Miércoles', abr: 'X', num: 3 },
  { label: 'Jueves', abr: 'J', num: 4 },
  { label: 'Viernes', abr: 'V', num: 5 },
  { label: 'Sábado', abr: 'S', num: 6 },
  { label: 'Domingo', abr: 'D', num: 0 },
];

const CAL_HORA_INICIO = 7;
const CAL_HORA_FIN = 21;
const CAL_PX_HORA = 48;
const CAL_TOTAL_PX = (CAL_HORA_FIN - CAL_HORA_INICIO) * CAL_PX_HORA;

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorarioDia {
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
  minutos_buffer: number;
}
type HorarioState = Record<number, HorarioDia>;

interface ToastMsg {
  id: string;
  tipo: 'success' | 'error';
  texto: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function horaToMinutos(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + (mm || 0);
}

function topPx(horaStr: string): number {
  return Math.max(0, (horaToMinutos(horaStr) / 60 - CAL_HORA_INICIO) * CAL_PX_HORA);
}

function altoPx(ini: string, fin: string): number {
  return Math.max(8, (horaToMinutos(fin) - horaToMinutos(ini)) / 60 * CAL_PX_HORA);
}

function formatResumenHorario(disps: IDisponibilidad[]): string {
  if (disps.length === 0) return '';
  const ABR: Record<number, string> = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const grupos = new Map<string, number[]>();
  disps.forEach(d => {
    const k = `${d.hora_inicio.slice(0, 5)}–${d.hora_fin.slice(0, 5)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(d.dia_semana);
  });
  return Array.from(grupos.entries())
    .map(([rango, dias]) => {
      const sorted = dias.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
      return `${sorted.map(d => ABR[d]).join('')} ${rango}`;
    })
    .join(' · ');
}

function buildHorarioInicial(disps: IDisponibilidad[]): HorarioState {
  const estado: HorarioState = {};
  DIAS_CONFIG.forEach(({ num }) => {
    estado[num] = { activo: false, hora_inicio: '09:00', hora_fin: '18:00', minutos_buffer: 10 };
  });
  disps.forEach(d => {
    estado[d.dia_semana] = {
      activo: true,
      hora_inicio: d.hora_inicio.slice(0, 5),
      hora_fin: d.hora_fin.slice(0, 5),
      minutos_buffer: d.minutos_buffer,
    };
  });
  return estado;
}

function buildPreviewHorario(h: HorarioState): string {
  const ABR: Record<number, string> = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };
  const activos = DIAS_CONFIG.filter(d => h[d.num]?.activo);
  if (activos.length === 0) return 'Sin días activos';
  const diasStr = activos.map(d => ABR[d.num]).join(' ');
  const primero = h[activos[0].num];
  const buffer = primero.minutos_buffer;
  return `Disponible: ${diasStr} · ${primero.hora_inicio} – ${primero.hora_fin} (${buffer} min entre citas)`;
}

function validarHorario(h: HorarioState): string | null {
  const activos = DIAS_CONFIG.filter(d => h[d.num]?.activo);
  if (activos.length === 0) return 'Selecciona al menos un día';
  for (const d of activos) {
    const v = h[d.num];
    if (horaToMinutos(v.hora_fin) <= horaToMinutos(v.hora_inicio))
      return `${d.label}: la hora de fin debe ser posterior al inicio`;
    if (v.minutos_buffer < 5 || v.minutos_buffer > 60)
      return `${d.label}: el buffer debe estar entre 5 y 60 minutos`;
  }
  return null;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const schemaCrear = z.object({
  nombre_completo:    z.string().min(2, 'Mínimo 2 caracteres'),
  telefono:           z.string().optional().or(z.literal('')),
  correo:             z.string().email('Correo inválido'),
  contrasena:         z.string().min(8, 'Mínimo 8 caracteres'),
  especialidad:       z.string().min(1, 'Selecciona una especialidad'),
  color_agenda:       z.string().min(1),
  comision_porcentaje: z.number().min(0).max(100),
  tipo_contrato:      z.enum(['planilla', 'honorarios']),
});

const schemaEditar = z.object({
  nombre_completo:    z.string().min(2, 'Mínimo 2 caracteres'),
  telefono:           z.string().optional().or(z.literal('')),
  especialidad:       z.string().min(1, 'Selecciona una especialidad'),
  color_agenda:       z.string().min(1),
  comision_porcentaje: z.number().min(0).max(100),
  tipo_contrato:      z.enum(['planilla', 'honorarios']),
});

type FormCrear = z.infer<typeof schemaCrear>;

// ─── BadgeActivo ──────────────────────────────────────────────────────────────

function BadgeActivo({ activo }: { activo: boolean }) {
  return (
    <motion.span
      key={String(activo)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold tracking-[0.02em]"
      style={{
        background: activo ? 'oklch(0.95 0.05 142)' : 'oklch(0.95 0.03 22)',
        color: activo ? 'oklch(0.4 0.15 142)' : 'oklch(0.45 0.15 22)',
        border: `1px solid ${activo ? 'oklch(0.85 0.08 142)' : 'oklch(0.88 0.06 22)'}`,
      }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full inline-block"
        style={{
          background: activo ? 'oklch(0.55 0.18 142)' : 'oklch(0.55 0.18 22)',
          boxShadow: activo ? '0 0 0 2px oklch(0.75 0.12 142 / 0.4)' : 'none',
        }}
      />
      {activo ? 'Activa' : 'Inactiva'}
    </motion.span>
  );
}

// ─── AvatarEsp ────────────────────────────────────────────────────────────────

function AvatarEsp({ personal, size = 36 }: { personal: IPersonal; size?: number }) {
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${hexAlpha(personal.color_agenda, 0.25)}, ${hexAlpha(personal.color_agenda, 0.12)})`,
        border: `2px solid ${hexAlpha(personal.color_agenda, 0.35)}`,
        color: personal.color_agenda,
        fontSize: size * 0.34,
        letterSpacing: '-0.01em',
        boxShadow: `0 0 0 3px ${hexAlpha(personal.color_agenda, 0.08)}`,
      }}
    >
      {iniciales(personal.nombre_completo)}
    </div>
  );
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORES.map(c => (
        <motion.button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          animate={{ scale: value === c ? 1.15 : 1 }}
          whileHover={{ scale: value === c ? 1.15 : 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.15 }}
          className="w-7 h-7 rounded-full border-none cursor-pointer shrink-0"
          style={{
            background: c,
            outline: value === c ? `2.5px solid var(--accent)` : '2.5px solid transparent',
            outlineOffset: 2,
            boxShadow: value === c
              ? `0 0 0 4px ${hexAlpha(c, 0.22)}, 0 2px 6px ${hexAlpha(c, 0.4)}`
              : `0 2px 4px ${hexAlpha(c, 0.3)}`,
          }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

// ─── SkeletonFila ─────────────────────────────────────────────────────────────

function SkeletonFila() {
  return (
    <tr>
      {[48, 140, 110, 72, 64, 40].map((w, i) => (
        <td key={i} className="p-[14px_16px]">
          <div
            className="animate-shimmer"
            style={{
              height: i === 0 ? 36 : 13,
              width: i === 0 ? 36 : w,
              borderRadius: i === 0 ? '50%' : 6,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── CalendarioSemanal ────────────────────────────────────────────────────────

function CalendarioSemanal({
  personal, disponibilidades,
}: {
  personal: IPersonal[];
  disponibilidades: Map<string, IDisponibilidad[]>;
}) {
  const horas = Array.from({ length: CAL_HORA_FIN - CAL_HORA_INICIO + 1 }, (_, i) => CAL_HORA_INICIO + i);

  return (
    <div
      className="bg-surface-raised border border-border-subtle rounded-[20px] overflow-hidden sticky top-6"
      style={{ boxShadow: '0 4px 24px oklch(0.12 0.038 288 / 0.06)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-border-subtle flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, var(--surface-raised), var(--surface-bg))' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-glow flex items-center justify-center">
            <Calendar size={14} strokeWidth={2} color="var(--accent)" />
          </div>
          <h2 className="m-0 text-[14px] font-semibold text-ink-strong">
            Disponibilidad semanal
          </h2>
        </div>
        {personal.length > 0 && (
          <span className="text-[11px] font-semibold text-ink-subtle bg-surface-bg px-2 py-[2px] rounded-full border border-border-subtle">
            {personal.length} activa{personal.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Leyenda especialistas */}
      {personal.length > 0 && (
        <div className="px-5 py-[10px] border-b border-border-subtle flex gap-3 flex-wrap bg-surface-bg">
          {personal.map(p => (
            <div key={p.id} className="flex items-center gap-[6px]">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{
                  background: p.color_agenda,
                  boxShadow: `0 0 0 2px ${hexAlpha(p.color_agenda, 0.2)}`,
                }}
              />
              <span className="text-[11px] text-ink-muted font-medium">
                {p.nombre_completo?.split(' ')[0] ?? p.especialidad}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex overflow-auto max-h-[440px]">
        {/* Eje de horas */}
        <div className="w-12 shrink-0 relative" style={{ height: CAL_TOTAL_PX }}>
          {horas.map(h => (
            <div
              key={h}
              className="absolute right-2 text-[9px] text-ink-subtle leading-none whitespace-nowrap font-medium"
              style={{ top: (h - CAL_HORA_INICIO) * CAL_PX_HORA - 7 }}
            >
              {String(h).padStart(2, '0')}h
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        <div className="flex-1 grid grid-cols-7">
          {DIAS_CONFIG.map(({ abr, num }) => {
            const bloques = personal.flatMap(p =>
              (disponibilidades.get(p.id) ?? [])
                .filter(d => d.dia_semana === num)
                .map(d => ({ d, p }))
            );

            return (
              <div
                key={num}
                className="border-l border-border-subtle relative"
                style={{ height: CAL_TOTAL_PX }}
              >
                {/* Header día */}
                <div className="text-center py-[6px] text-[10px] font-bold text-ink-subtle border-b border-border-subtle bg-surface-raised sticky top-0 z-[1] tracking-[0.05em]">
                  {abr}
                </div>

                {/* Líneas de horas */}
                {horas.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border-subtle"
                    style={{
                      top: (h - CAL_HORA_INICIO) * CAL_PX_HORA,
                      opacity: h === CAL_HORA_INICIO ? 0 : 0.4,
                    }}
                  />
                ))}

                {/* Bloques de disponibilidad */}
                {bloques.map(({ d, p }, idx) => {
                  const count = bloques.length;
                  const pct = 100 / count;
                  const ini = d.hora_inicio.slice(0, 5);
                  const fin = d.hora_fin.slice(0, 5);
                  return (
                    <div
                      key={d.id}
                      title={`${p.nombre_completo?.split(' ')[0] ?? p.especialidad} · ${ini}–${fin}`}
                      className="absolute overflow-hidden"
                      style={{
                        top: topPx(ini) + 22,
                        height: Math.max(altoPx(ini, fin) - 4, 8),
                        left: `${idx * pct + 1}%`,
                        width: `calc(${pct}% - 3px)`,
                        background: hexAlpha(p.color_agenda, 0.15),
                        borderLeft: `3px solid ${p.color_agenda}`,
                        borderRadius: '0 4px 4px 0',
                        padding: '3px 4px',
                      }}
                    >
                      <span
                        className="text-[8px] font-bold leading-none block overflow-hidden whitespace-nowrap text-ellipsis"
                        style={{ color: p.color_agenda }}
                      >
                        {p.nombre_completo?.split(' ')[0] ?? '—'}
                      </span>
                      <span
                        className="text-[7px] block leading-none mt-[1px]"
                        style={{ color: p.color_agenda, opacity: 0.75 }}
                      >
                        {ini}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PanelBase (overlay + slide) ─────────────────────────────────────────────

function PanelBase({
  ancho, onClose, children, reduced,
}: {
  ancho: number; onClose: () => void; children: React.ReactNode; reduced: boolean;
}) {
  return createPortal(
    <>
      <motion.div
        key="overlay"
        initial={reduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-sm"
        style={{
          background: 'oklch(0.12 0.038 288 / 0.45)',
          zIndex: 'var(--z-modal-backdrop)' as never,
        }}
      />
      <motion.div
        key="panel"
        initial={reduced ? {} : { x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.32, ease: EASE }}
        className="fixed top-0 right-0 bottom-0 bg-surface-raised flex flex-col overflow-y-auto border-l border-border-subtle"
        style={{
          width: ancho,
          maxWidth: '100vw',
          boxShadow: '-8px 0 48px oklch(0.12 0.038 288 / 0.12)',
          zIndex: 'var(--z-modal)' as never,
        }}
      >
        {children}
      </motion.div>
    </>,
    document.body
  );
}

// ─── PanelDetalle ─────────────────────────────────────────────────────────────

function PanelDetalle({
  miembro, disponibilidades, onClose, onEditar, onHorarios, onToggle, reduced,
}: {
  miembro: IPersonal;
  disponibilidades: IDisponibilidad[];
  onClose: () => void;
  onEditar: () => void;
  onHorarios: () => void;
  onToggle: () => void;
  reduced: boolean;
}) {
  const resumen = formatResumenHorario(disponibilidades);

  return (
    <PanelBase ancho={440} onClose={onClose} reduced={reduced}>
      {/* Header con gradiente */}
      <div
        className="px-6 pt-7 pb-5 border-b border-border-subtle shrink-0"
        style={{ background: `linear-gradient(160deg, ${hexAlpha(miembro.color_agenda, 0.08)} 0%, transparent 60%)` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[14px]">
            <AvatarEsp personal={miembro} size={56} />
            <div>
              <h2 className="m-0 text-lg font-bold text-ink-strong tracking-tight">
                {miembro.nombre_completo ?? '—'}
              </h2>
              <div className="mt-[6px] flex items-center gap-2">
                <BadgeActivo activo={miembro.esta_activo} />
                <span className="text-[11px] text-ink-subtle font-medium bg-surface-bg px-2 py-[2px] rounded-full border border-border-subtle">
                  {miembro.especialidad}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className={closeBtnClass}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">

        {/* Contacto */}
        {(miembro.correo || miembro.telefono) && (
          <div className="p-4 rounded-[14px] bg-surface-bg border border-border-subtle flex flex-col gap-[10px]">
            {miembro.correo && (
              <div className="flex items-center gap-[10px]">
                <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-center shrink-0">
                  <Mail size={13} strokeWidth={1.5} color="var(--ink-subtle)" />
                </div>
                <span className="text-[13px] text-ink-base">{miembro.correo}</span>
              </div>
            )}
            {miembro.telefono && (
              <div className="flex items-center gap-[10px]">
                <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-center shrink-0">
                  <Phone size={13} strokeWidth={1.5} color="var(--ink-subtle)" />
                </div>
                <span className="text-[13px] text-ink-base">{miembro.telefono}</span>
              </div>
            )}
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-[10px]">
          {[
            { label: 'Comisión', value: `${miembro.comision_porcentaje}%`, color: miembro.color_agenda },
            { label: 'Contrato', value: miembro.tipo_contrato === 'planilla' ? 'Planilla' : 'Honorarios', color: 'var(--accent)' },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-[14px] bg-surface-bg border border-border-subtle">
              <div className="text-[10px] text-ink-subtle font-bold uppercase tracking-[0.06em] mb-[6px]">
                {item.label}
              </div>
              <div className="text-[22px] font-bold text-ink-strong tracking-tight">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Color agenda */}
        <div className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-[10px] bg-surface-bg border border-border-subtle">
          <span
            className="w-5 h-5 rounded-[6px] shrink-0 inline-block"
            style={{
              background: miembro.color_agenda,
              boxShadow: `0 2px 6px ${hexAlpha(miembro.color_agenda, 0.4)}`,
            }}
          />
          <span className="text-[12px] text-ink-muted font-medium">
            Color en agenda
          </span>
          <span className="ml-auto text-[11px] text-ink-subtle font-mono">
            {miembro.color_agenda}
          </span>
        </div>

        {/* Horario */}
        <div>
          <div className="text-[10px] font-bold text-ink-subtle uppercase tracking-[0.06em] mb-2">
            Horario
          </div>
          {resumen ? (
            <div
              className="px-[14px] py-[10px] rounded-[10px] text-[12px] text-ink-base flex items-center gap-2"
              style={{
                background: hexAlpha('#834DFB', 0.06),
                border: `1px solid ${hexAlpha('#834DFB', 0.15)}`,
              }}
            >
              <Clock size={13} strokeWidth={2} color="var(--accent)" />
              {resumen}
            </div>
          ) : (
            <div
              className="px-[14px] py-[10px] rounded-[10px] text-[12px] flex items-center gap-2"
              style={{ background: 'oklch(0.97 0.015 80)', border: '1px solid oklch(0.9 0.05 80)', color: 'oklch(0.55 0.1 80)' }}
            >
              <AlertCircle size={13} strokeWidth={2} />
              Sin horarios configurados
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="px-5 py-4 border-t border-border-subtle flex gap-2 shrink-0 bg-surface-bg">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onEditar} className={btnSecondaryClass}>
          <Edit2 size={13} strokeWidth={1.5} /> Editar
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onHorarios} className={btnSecondaryClass}>
          <Calendar size={13} strokeWidth={1.5} /> Horarios
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onToggle}
          className="inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[9px] border-[1.5px] text-[12px] font-medium cursor-pointer ml-auto"
          style={{
            color: miembro.esta_activo ? 'oklch(0.5 0.18 22)' : 'oklch(0.45 0.18 142)',
            borderColor: miembro.esta_activo ? 'oklch(0.82 0.1 22)' : 'oklch(0.82 0.1 142)',
            background: miembro.esta_activo ? 'oklch(0.97 0.03 22)' : 'oklch(0.97 0.03 142)',
          }}
        >
          {miembro.esta_activo
            ? <><ToggleRight size={13} strokeWidth={1.5} /> Desactivar</>
            : <><ToggleLeft size={13} strokeWidth={1.5} /> Activar</>}
        </motion.button>
      </div>
    </PanelBase>
  );
}

// ─── PanelHorarios ────────────────────────────────────────────────────────────

function PanelHorarios({
  miembro, disponibilidades, onClose, onGuardado, reduced,
}: {
  miembro: IPersonal;
  disponibilidades: IDisponibilidad[];
  onClose: () => void;
  onGuardado: () => void;
  reduced: boolean;
}) {
  const [horario, setHorario] = useState<HorarioState>(() => buildHorarioInicial(disponibilidades));
  const [guardando, setGuardando] = useState(false);
  const [errValidacion, setErrValidacion] = useState<string | null>(null);

  function setDia(num: number, patch: Partial<HorarioDia>) {
    setHorario(h => ({ ...h, [num]: { ...h[num], ...patch } }));
    setErrValidacion(null);
  }

  async function guardar() {
    const err = validarHorario(horario);
    if (err) { setErrValidacion(err); return; }
    setGuardando(true);
    try {
      const activos: IDisponibilidadCreate[] = DIAS_CONFIG
        .filter(d => horario[d.num]?.activo)
        .map(d => ({
          personal_id: miembro.id,
          dia_semana: d.num,
          hora_inicio: horario[d.num].hora_inicio,
          hora_fin: horario[d.num].hora_fin,
          minutos_buffer: horario[d.num].minutos_buffer,
        }));
      await personalService.guardarHorarios(miembro.id, activos);
      onGuardado();
    } catch {
      setErrValidacion('Error al guardar los horarios. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelBase ancho={520} onClose={onClose} reduced={reduced}>
      {/* Header */}
      <div
        className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0"
        style={{ background: `linear-gradient(160deg, ${hexAlpha(miembro.color_agenda, 0.06)} 0%, transparent 60%)` }}
      >
        <div className="flex items-center gap-3">
          <AvatarEsp personal={miembro} size={34} />
          <div>
            <h2 className="m-0 text-base font-bold text-ink-strong tracking-tight">
              Horarios
            </h2>
            <p className="m-0 text-[12px] text-ink-subtle">
              {miembro.nombre_completo?.split(' ')[0] ?? 'Especialista'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className={closeBtnClass}><X size={14} strokeWidth={2} /></button>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 px-6 py-5 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {DIAS_CONFIG.map(({ label, abr, num }) => {
            const v = horario[num];
            return (
              <div
                key={num}
                className="rounded-[14px] overflow-hidden transition-all duration-150"
                style={{
                  border: `1px solid ${v.activo ? hexAlpha('#834DFB', 0.25) : 'var(--border-subtle)'}`,
                  background: v.activo ? hexAlpha('#834DFB', 0.04) : 'transparent',
                }}
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-[10px]">
                    <span
                      className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-[11px] font-extrabold shrink-0 transition-all duration-150"
                      style={{
                        background: v.activo ? 'var(--accent)' : 'var(--surface-bg)',
                        border: v.activo ? 'none' : '1px solid var(--border-base)',
                        color: v.activo ? 'white' : 'var(--ink-muted)',
                      }}
                    >
                      {abr}
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: v.activo ? 'var(--ink-strong)' : 'var(--ink-subtle)' }}
                    >
                      {label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDia(num, { activo: !v.activo })}
                    className="bg-transparent border-none cursor-pointer p-0 flex"
                    style={{ color: v.activo ? 'var(--accent)' : 'var(--ink-subtle)' }}
                    aria-label={v.activo ? `Desactivar ${label}` : `Activar ${label}`}
                  >
                    {v.activo
                      ? <ToggleRight size={22} strokeWidth={1.5} />
                      : <ToggleLeft size={22} strokeWidth={1.5} />}
                  </button>
                </div>

                <AnimatePresence>
                  {v.activo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-[14px] grid gap-[10px] items-end" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                        <div>
                          <label className={labelClass}>Inicio</label>
                          <input
                            type="time"
                            value={v.hora_inicio}
                            onChange={e => setDia(num, { hora_inicio: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Fin</label>
                          <input
                            type="time"
                            value={v.hora_fin}
                            onChange={e => setDia(num, { hora_fin: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Buffer</label>
                          <div className="relative">
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={v.minutos_buffer}
                              onChange={e => setDia(num, { minutos_buffer: parseInt(e.target.value) || 10 })}
                              className={inputClass}
                              style={{ width: 72, paddingRight: 28 }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-medium">min</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Preview */}
        <div
          className="mt-4 px-[14px] py-[10px] rounded-[10px] text-[12px] text-accent font-medium flex items-center gap-2"
          style={{
            background: hexAlpha('#834DFB', 0.07),
            border: `1px solid ${hexAlpha('#834DFB', 0.18)}`,
          }}
        >
          <Clock size={12} strokeWidth={2} />
          {buildPreviewHorario(horario)}
        </div>

        {errValidacion && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-[10px] px-[14px] py-[10px] rounded-[10px] text-[12px] font-medium flex items-center gap-2"
            style={{ background: 'oklch(0.97 0.03 22)', border: '1px solid oklch(0.88 0.08 22)', color: 'oklch(0.5 0.18 22)' }}
          >
            <AlertCircle size={13} strokeWidth={2} /> {errValidacion}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-subtle flex gap-[10px] justify-end shrink-0 bg-surface-bg">
        <button onClick={onClose} className={btnGhostClass}>Cancelar</button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={guardar}
          disabled={guardando}
          className={`${btnPrimaryClass} min-w-[140px]`}
          style={{ opacity: guardando ? 0.7 : 1 }}
        >
          {guardando ? 'Guardando…' : 'Guardar horarios'}
        </motion.button>
      </div>
    </PanelBase>
  );
}

// ─── AdminUsuariosLink ────────────────────────────────────────────────────────

function AdminUsuariosLink({ usuarioId }: { usuarioId: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/admin/usuarios?highlight=${usuarioId}`)}
      className="font-semibold text-accent underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 text-[11px]"
    >
      Administración de Usuarios
    </button>
  );
}

// ─── PanelFormulario ──────────────────────────────────────────────────────────

function PanelFormulario({
  miembro, onClose, onGuardado, reduced,
}: {
  miembro: IPersonal | null;
  onClose: () => void;
  onGuardado: () => void;
  reduced: boolean;
}) {
  const esEdicion = miembro !== null;

  const {
    register, handleSubmit, control, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormCrear>({
    resolver: zodResolver(esEdicion ? (schemaEditar as unknown as typeof schemaCrear) : schemaCrear),
    defaultValues: esEdicion ? {
      nombre_completo: miembro.nombre_completo ?? '',
      telefono: miembro.telefono ?? '',
      especialidad: miembro.especialidad,
      color_agenda: miembro.color_agenda,
      comision_porcentaje: miembro.comision_porcentaje,
      tipo_contrato: miembro.tipo_contrato as 'planilla' | 'honorarios',
    } : {
      color_agenda: COLORES[0],
      comision_porcentaje: 0,
      tipo_contrato: 'planilla',
    },
  });

  const colorWatch = watch('color_agenda');
  const [apiError, setApiError] = useState<string | null>(null);

  async function onSubmit(data: FormCrear) {
    setApiError(null);
    try {
      if (esEdicion) {
        await personalService.actualizar(miembro.id, {
          nombre_completo: data.nombre_completo,
          telefono: data.telefono || null,
          especialidad: data.especialidad,
          color_agenda: data.color_agenda,
          comision_porcentaje: data.comision_porcentaje,
          tipo_contrato: data.tipo_contrato,
        });
      } else {
        await personalService.crearCompleto({
          nombre_completo: data.nombre_completo,
          correo: data.correo,
          contrasena: data.contrasena,
          especialidad: data.especialidad,
          color_agenda: data.color_agenda,
          comision_porcentaje: data.comision_porcentaje,
          tipo_contrato: data.tipo_contrato,
        });
      }
      onGuardado();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setApiError(msg ?? 'Ocurrió un error. Intenta de nuevo.');
    }
  }

  return (
    <PanelBase ancho={480} onClose={onClose} reduced={reduced}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Header */}
        <div
          className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0"
          style={{
            background: colorWatch ? `linear-gradient(160deg, ${hexAlpha(colorWatch, 0.07)} 0%, transparent 60%)` : undefined,
          }}
        >
          <div>
            <h2 className="m-0 text-base font-bold text-ink-strong tracking-tight">
              {esEdicion ? 'Editar especialista' : 'Nueva especialista'}
            </h2>
            {esEdicion && (
              <p className="m-0 mt-[2px] text-[12px] text-ink-subtle">
                {miembro.nombre_completo}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className={closeBtnClass}><X size={14} strokeWidth={2} /></button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 px-6 py-5 overflow-y-auto flex flex-col gap-5">

          {/* Cuenta (solo creación) */}
          {!esEdicion && (
            <div className="flex flex-col gap-[14px]">
              <SectionTitle icon={<User size={12} strokeWidth={2} />} label="Cuenta" />
              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input
                  {...register('nombre_completo')}
                  placeholder="Ej. Sofía Torres"
                  className={errors.nombre_completo ? inputErrorClass : inputClass}
                />
                {errors.nombre_completo && <span className={errorClass}>{errors.nombre_completo.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Correo electrónico *</label>
                <input
                  {...register('correo')}
                  type="email"
                  placeholder="sofia@eunoia.pe"
                  className={errors.correo ? inputErrorClass : inputClass}
                />
                {errors.correo && <span className={errorClass}>{errors.correo.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Contraseña *</label>
                <input
                  {...register('contrasena')}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className={errors.contrasena ? inputErrorClass : inputClass}
                />
                {errors.contrasena && <span className={errorClass}>{errors.contrasena.message}</span>}
              </div>
            </div>
          )}

          {/* Datos personales (solo edición) */}
          {esEdicion && (
            <div className="flex flex-col gap-[14px]">
              <SectionTitle icon={<User size={12} strokeWidth={2} />} label="Datos personales" />
              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input
                  {...register('nombre_completo')}
                  placeholder="Ej. Sofía Torres"
                  className={errors.nombre_completo ? inputErrorClass : inputClass}
                />
                {errors.nombre_completo && <span className={errorClass}>{errors.nombre_completo.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  {...register('telefono')}
                  placeholder="+51 999 000 000"
                  className={inputClass}
                />
              </div>
              {miembro?.correo && (
                <div className="flex flex-col gap-[6px]">
                  <label className={labelClass}>Correo electrónico</label>
                  <div className={`${inputClass} flex items-center gap-2 text-ink-muted cursor-default select-text`}>
                    <Mail size={13} strokeWidth={1.5} className="text-ink-subtle shrink-0" />
                    <span className="flex-1 truncate">{miembro.correo}</span>
                  </div>
                  <div className="flex items-center gap-[6px] text-[11px] text-ink-subtle">
                    <span>El correo solo se edita desde</span>
                    <AdminUsuariosLink usuarioId={miembro.usuario_id} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Perfil profesional */}
          <div className="flex flex-col gap-[14px]">
            <SectionTitle icon={<Sparkles size={12} strokeWidth={2} />} label="Perfil profesional" />
            <div>
              <label className={labelClass}>Especialidad *</label>
              <select
                {...register('especialidad')}
                className={errors.especialidad ? inputErrorClass : inputClass}
              >
                <option value="">Selecciona…</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              {errors.especialidad && <span className={errorClass}>{errors.especialidad.message}</span>}
            </div>

            <div>
              <label className={labelClass}>Color en agenda</label>
              <Controller
                name="color_agenda"
                control={control}
                render={({ field }) => (
                  <ColorPicker value={field.value ?? COLORES[0]} onChange={field.onChange} />
                )}
              />
              {colorWatch && (
                <div className="mt-2 flex items-center gap-[6px]">
                  <span
                    className="w-[14px] h-[14px] rounded inline-block"
                    style={{
                      background: colorWatch,
                      boxShadow: `0 2px 4px ${hexAlpha(colorWatch, 0.4)}`,
                    }}
                  />
                  <span className="text-[11px] text-ink-subtle font-mono">{colorWatch}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Comisión (%)</label>
                <div className="relative">
                  <input
                    {...register('comision_porcentaje', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="0"
                    className={errors.comision_porcentaje ? inputErrorClass : inputClass}
                    style={{ paddingRight: 28 }}
                  />
                  <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[12px] text-ink-muted font-semibold">%</span>
                </div>
                {errors.comision_porcentaje && <span className={errorClass}>{errors.comision_porcentaje.message}</span>}
              </div>
              <div>
                <label className={labelClass}>Tipo de contrato</label>
                <select {...register('tipo_contrato')} className={inputClass}>
                  <option value="planilla">Planilla</option>
                  <option value="honorarios">Honorarios</option>
                </select>
              </div>
            </div>
          </div>

          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="px-[14px] py-[10px] rounded-[10px] text-[12px] font-medium flex items-center gap-2"
              style={{ background: 'oklch(0.97 0.03 22)', border: '1px solid oklch(0.88 0.08 22)', color: 'oklch(0.5 0.18 22)' }}
            >
              <AlertCircle size={13} strokeWidth={2} /> {apiError}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex gap-[10px] justify-end shrink-0 bg-surface-bg">
          <button type="button" onClick={onClose} className={btnGhostClass}>Cancelar</button>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            className={`${btnPrimaryClass} min-w-[150px]`}
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear especialista'}
          </motion.button>
        </div>
      </form>
    </PanelBase>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-[6px] pb-[10px] border-b border-border-subtle">
      <span className="text-accent flex">{icon}</span>
      <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-[0.06em]">
        {label}
      </span>
    </div>
  );
}

// ─── Toaster ──────────────────────────────────────────────────────────────────

function Toaster({ toasts }: { toasts: ToastMsg[] }) {
  return createPortal(
    <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="px-4 py-[10px] rounded-xl text-white text-[13px] font-medium max-w-[300px] flex items-center gap-2 pointer-events-all"
            style={{
              background: t.tipo === 'success' ? 'oklch(0.25 0.05 142)' : 'oklch(0.25 0.05 22)',
              boxShadow: '0 8px 24px oklch(0.12 0.038 288 / 0.2)',
            }}
          >
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: t.tipo === 'success' ? 'oklch(0.7 0.2 142)' : 'oklch(0.7 0.2 22)' }}
            />
            {t.texto}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// ─── Class helpers ────────────────────────────────────────────────────────────

const inputClass = 'w-full px-3 py-2 border-[1.5px] border-border-base rounded-[10px] bg-surface-bg text-ink-strong text-[13px] font-normal outline-none box-border transition-[border-color,box-shadow] duration-150';
const inputErrorClass = 'w-full px-3 py-2 border-[1.5px] border-error rounded-[10px] text-[13px] font-normal outline-none box-border transition-[border-color,box-shadow] duration-150' + ' ' + 'bg-[oklch(0.99_0.01_22)]';
const labelClass = 'block mb-[5px] text-[11px] font-semibold text-ink-muted tracking-[0.01em]';
const errorClass = 'block mt-1 text-[11px] font-medium' + ' ' + 'text-[oklch(0.55_0.18_22)]';
const closeBtnClass = 'w-[30px] h-[30px] flex items-center justify-center rounded-lg border border-border-base bg-transparent cursor-pointer text-ink-muted shrink-0 transition-[background] duration-150';
const btnGhostClass = 'px-4 py-2 rounded-[10px] border-[1.5px] border-border-base bg-transparent text-ink-muted text-[13px] font-medium cursor-pointer';
const btnPrimaryClass = 'px-5 py-2 rounded-[10px] border-none bg-accent text-white text-[13px] font-semibold cursor-pointer shadow-[0_2px_8px_oklch(0.55_0.28_288_/_0.3)]';
const btnSecondaryClass = 'inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[9px] border-[1.5px] border-border-base bg-transparent text-ink-muted text-[12px] font-medium cursor-pointer';

// ─── PersonalPage ─────────────────────────────────────────────────────────────

type PanelTipo = 'crear' | 'editar' | 'horarios' | 'detalle';

export default function PersonalPage() {
  const [personal, setPersonal] = useState<IPersonal[]>([]);
  const [disps, setDisps] = useState<Map<string, IDisponibilidad[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelTipo | null>(null);
  const [seleccionado, setSeleccionado] = useState<IPersonal | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const cargar = useCallback(async () => {
    try {
      const lista = await personalService.obtenerPersonal();
      setPersonal(lista);
      const dispsArr = await Promise.all(lista.map(p => personalService.obtenerDisponibilidad(p.id)));
      const m = new Map<string, IDisponibilidad[]>();
      lista.forEach((p, i) => m.set(p.id, dispsArr[i]));
      setDisps(m);
      setError(null);
    } catch {
      setError('No se pudo cargar el personal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    personalService.obtenerPersonal()
      .then(lista =>
        Promise.all(lista.map(p => personalService.obtenerDisponibilidad(p.id)))
          .then(dispsArr => {
            const m = new Map<string, IDisponibilidad[]>();
            lista.forEach((p, i) => m.set(p.id, dispsArr[i]));
            setPersonal(lista);
            setDisps(m);
            setError(null);
          })
      )
      .catch(() => setError('No se pudo cargar el personal. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  function toast(texto: string, tipo: 'success' | 'error' = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function abrirDetalle(m: IPersonal) { setSeleccionado(m); setPanel('detalle'); }
  function abrirEditar(m: IPersonal) { setSeleccionado(m); setPanel('editar'); }
  function abrirHorarios(m: IPersonal) { setSeleccionado(m); setPanel('horarios'); }
  function cerrarPanel() { setPanel(null); }

  async function toggleActivo(m: IPersonal) {
    const prev = personal;
    setPersonal(p => p.map(x => x.id === m.id ? { ...x, esta_activo: !m.esta_activo } : x));
    if (seleccionado?.id === m.id) setSeleccionado(s => s ? { ...s, esta_activo: !m.esta_activo } : s);
    try {
      await personalService.toggleActivo(m.id, !m.esta_activo);
      toast(m.esta_activo ? 'Especialista desactivada' : 'Especialista activada');
    } catch {
      setPersonal(prev);
      toast('No se pudo actualizar el estado', 'error');
    }
  }

  async function onGuardadoFormulario() {
    cerrarPanel(); await cargar();
    toast(panel === 'crear' ? 'Especialista creada' : 'Perfil actualizado');
  }

  async function onGuardadoHorarios() {
    cerrarPanel(); await cargar();
    toast('Horarios actualizados');
  }

  const disponibilidadesSeleccionado = useMemo(
    () => seleccionado ? (disps.get(seleccionado.id) ?? []) : [],
    [seleccionado, disps]
  );

  const activas = personal.filter(p => p.esta_activo).length;
  const inactivas = personal.filter(p => !p.esta_activo).length;

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-ink-strong tracking-[-0.03em]">
            Personal
          </h1>
          {!loading && personal.length > 0 && (
            <p className="m-0 mt-1 text-[13px] text-ink-muted">
              {activas} activa{activas !== 1 ? 's' : ''}
              {inactivas > 0 && ` · ${inactivas} inactiva${inactivas !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={cargar}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-[10px] border-[1.5px] border-border-base bg-surface-raised text-ink-muted cursor-pointer"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              className={loading ? 'animate-spin' : ''}
            />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setSeleccionado(null); setPanel('crear'); }}
            className="inline-flex items-center gap-[7px] px-[18px] h-9 rounded-[10px] border-none bg-accent text-white text-[13px] font-semibold cursor-pointer"
            style={{ boxShadow: '0 2px 10px oklch(0.55 0.28 288 / 0.28)' }}
          >
            <Plus size={15} strokeWidth={2.5} /> Agregar especialista
          </motion.button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-[14px] text-[13px]"
            style={{ background: 'oklch(0.97 0.03 22)', border: '1px solid oklch(0.88 0.08 22)', color: 'oklch(0.5 0.18 22)' }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            <span className="flex-1">{error}</span>
            <button
              onClick={cargar}
              className="px-4 py-2 rounded-[10px] border-[1.5px] bg-transparent text-[12px] font-medium cursor-pointer"
              style={{ color: 'oklch(0.5 0.18 22)', borderColor: 'oklch(0.82 0.1 22)' }}
            >
              Reintentar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout vertical */}
      <div className="flex flex-col gap-5">
        {/* Tabla */}
        <section>
          <div
            className="bg-surface-raised border border-border-subtle rounded-[20px] overflow-hidden"
            style={{ boxShadow: '0 4px 24px oklch(0.12 0.038 288 / 0.05)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-surface-bg">
                    {['Especialista', 'Especialidad', 'Horario', 'Comisión', 'Estado', ''].map((col, i) => (
                      <th
                        key={col}
                        className="text-left px-4 py-[10px] border-b border-border-subtle text-ink-subtle text-[10px] font-bold whitespace-nowrap tracking-[0.05em] uppercase"
                        style={{ width: i === 5 ? 80 : undefined }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [0, 1, 2, 3, 4].map(i => <SkeletonFila key={i} />)
                  ) : personal.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center px-6 py-14 gap-[14px]">
                          <div className="w-[52px] h-[52px] rounded-2xl bg-surface-bg border border-border-subtle flex items-center justify-center">
                            <User size={22} strokeWidth={1} color="var(--ink-subtle)" />
                          </div>
                          <div className="text-center">
                            <div className="text-[14px] font-semibold text-ink-strong mb-1">
                              Sin especialistas
                            </div>
                            <div className="text-[12px] text-ink-muted">
                              Agrega a tu equipo para empezar
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setSeleccionado(null); setPanel('crear'); }}
                            className={`${btnPrimaryClass} text-[13px]`}
                          >
                            + Agregar especialista
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ) : personal.map((m, i) => {
                    const isHov = hoveredId === m.id;
                    const dispMiembro = disps.get(m.id) ?? [];
                    const resumen = formatResumenHorario(dispMiembro);
                    return (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25, ease: EASE }}
                        onMouseEnter={() => setHoveredId(m.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="border-b border-border-subtle transition-[background] duration-[120ms]"
                        style={{ background: isHov ? hexAlpha('#834DFB', 0.04) : 'transparent' }}
                      >
                        {/* Especialista */}
                        <td className="p-[12px_16px]">
                          <button
                            onClick={() => abrirDetalle(m)}
                            className="flex items-center gap-[10px] bg-transparent border-none cursor-pointer p-0 text-left"
                          >
                            <AvatarEsp personal={m} />
                            <div>
                              <div className="text-[13px] font-semibold text-ink-strong whitespace-nowrap flex items-center gap-1">
                                {m.nombre_completo ?? '—'}
                                {isHov && <ChevronRight size={12} strokeWidth={2} color="var(--ink-subtle)" />}
                              </div>
                              {m.correo && (
                                <div className="text-[11px] text-ink-muted mt-[1px] whitespace-nowrap">
                                  {m.correo}
                                </div>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* Especialidad */}
                        <td className="p-[12px_16px]">
                          <span className="text-[12px] text-ink-muted font-medium bg-surface-bg px-[9px] py-[3px] rounded-full border border-border-subtle whitespace-nowrap">
                            {m.especialidad}
                          </span>
                        </td>

                        {/* Horario */}
                        <td className="p-[12px_16px] max-w-[180px]">
                          {resumen ? (
                            <span className="text-[11px] text-ink-muted">{resumen}</span>
                          ) : (
                            <span
                              className="inline-flex px-2 py-[3px] rounded-full text-[10px] font-bold"
                              style={{ background: 'oklch(0.97 0.04 80)', border: '1px solid oklch(0.9 0.07 80)', color: 'oklch(0.5 0.12 80)' }}
                            >
                              Sin horario
                            </span>
                          )}
                        </td>

                        {/* Comisión */}
                        <td className="p-[12px_16px]">
                          <span className="text-[13px] font-semibold text-ink-base">
                            {m.comision_porcentaje}%
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="p-[12px_16px]">
                          <BadgeActivo activo={m.esta_activo} />
                        </td>

                        {/* Acciones */}
                        <td className="p-[12px_16px]">
                          <AnimatePresence>
                            {isHov && (
                              <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="flex items-center gap-1"
                              >
                                <ActionBtn icon={Calendar} label="Horarios" onClick={() => abrirHorarios(m)} />
                                <ActionBtn icon={Edit2} label="Editar" onClick={() => abrirEditar(m)} />
                                <ActionBtn
                                  icon={m.esta_activo ? ToggleRight : ToggleLeft}
                                  label={m.esta_activo ? 'Desactivar' : 'Activar'}
                                  onClick={() => toggleActivo(m)}
                                  color={m.esta_activo ? 'oklch(0.55 0.18 22)' : 'oklch(0.45 0.18 142)'}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Calendario */}
        <CalendarioSemanal personal={personal.filter(p => p.esta_activo)} disponibilidades={disps} />
      </div>

      {/* Paneles laterales */}
      <AnimatePresence>
        {panel === 'detalle' && seleccionado && (
          <PanelDetalle
            key="detalle"
            miembro={seleccionado}
            disponibilidades={disponibilidadesSeleccionado}
            onClose={cerrarPanel}
            onEditar={() => setPanel('editar')}
            onHorarios={() => setPanel('horarios')}
            onToggle={() => toggleActivo(seleccionado)}
            reduced={reduced}
          />
        )}
        {panel === 'horarios' && seleccionado && (
          <PanelHorarios
            key="horarios"
            miembro={seleccionado}
            disponibilidades={disponibilidadesSeleccionado}
            onClose={cerrarPanel}
            onGuardado={onGuardadoHorarios}
            reduced={reduced}
          />
        )}
        {(panel === 'crear' || panel === 'editar') && (
          <PanelFormulario
            key="formulario"
            miembro={panel === 'editar' ? seleccionado : null}
            onClose={cerrarPanel}
            onGuardado={onGuardadoFormulario}
            reduced={reduced}
          />
        )}
      </AnimatePresence>

      <Toaster toasts={toasts} />
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, label, onClick, color,
}: {
  icon: React.ElementType; label: string; onClick: () => void; color?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-lg border-[1.5px] border-border-base bg-surface-raised cursor-pointer"
      style={{ color: color ?? 'var(--ink-muted)' }}
    >
      <Icon size={12} strokeWidth={1.75} />
    </motion.button>
  );
}
