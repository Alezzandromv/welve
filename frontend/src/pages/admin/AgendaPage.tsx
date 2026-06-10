import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { EstadoCita } from '@/types';

// ─── Config visual ────────────────────────────────────────────────────────────

const HORA_INICIO = 8;
const HORA_FIN = 19;
const PX_POR_HORA = 64;
const TOTAL_PX = (HORA_FIN - HORA_INICIO) * PX_POR_HORA;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ESTADO_CFG: Record<EstadoCita, { label: string; color: string; bg: string }> = {
  pendiente:        { label: 'Pendiente',        color: 'var(--estado-pendiente)',         bg: 'var(--estado-pendiente-bg)' },
  confirmada:       { label: 'Confirmada',        color: 'var(--estado-confirmada)',        bg: 'var(--estado-confirmada-bg)' },
  en_curso:         { label: 'En curso',          color: 'var(--estado-en-curso)',          bg: 'var(--estado-en-curso-bg)' },
  completada:       { label: 'Completada',        color: 'var(--estado-completada)',        bg: 'var(--estado-completada-bg)' },
  cancelada:        { label: 'Cancelada',         color: 'var(--estado-cancelada)',         bg: 'var(--estado-cancelada-bg)' },
  cancelada_tardia: { label: 'Cancelada tardía',  color: 'var(--estado-cancelada-tardia)', bg: 'var(--estado-cancelada-tardia-bg)' },
  no_show:          { label: 'No show',           color: 'var(--estado-no-show)',           bg: 'var(--estado-no-show-bg)' },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CitaAgenda {
  id: string;
  inicioHora: number;
  inicioMin: number;
  duracionMin: number;
  cliente: string;
  servicio: string;
  estado: EstadoCita;
  colorEsp: string;
  personalIdx: 0 | 1;
}

interface Especialista {
  id: string;
  nombre: string;
  especialidad: string;
  iniciales: string;
  color: string;
}

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const ESPECIALISTAS: Especialista[] = [
  { id: 'e1', nombre: 'Sofía Martínez',  especialidad: 'Colorimetría',  iniciales: 'SM', color: 'oklch(0.67 0.158 285)' },
  { id: 'e2', nombre: 'Andrea López',    especialidad: 'Nail Art',       iniciales: 'AL', color: 'oklch(0.58 0.155 152)' },
];

const CITAS: CitaAgenda[] = [
  { id: 'a1',  inicioHora: 9,  inicioMin: 0,  duracionMin: 90,  cliente: 'Valentina Torres', servicio: 'Corte y color',      estado: 'completada', colorEsp: 'oklch(0.67 0.158 285)', personalIdx: 0 },
  { id: 'a2',  inicioHora: 11, inicioMin: 0,  duracionMin: 60,  cliente: 'Daniela Cruz',     servicio: 'Tratamiento capilar',estado: 'en_curso',   colorEsp: 'oklch(0.67 0.158 285)', personalIdx: 0 },
  { id: 'a3',  inicioHora: 13, inicioMin: 0,  duracionMin: 90,  cliente: 'Rosa Medina',      servicio: 'Alisado',             estado: 'confirmada', colorEsp: 'oklch(0.67 0.158 285)', personalIdx: 0 },
  { id: 'a4',  inicioHora: 15, inicioMin: 30, duracionMin: 60,  cliente: 'Mariana Vega',     servicio: 'Corte',              estado: 'pendiente',  colorEsp: 'oklch(0.67 0.158 285)', personalIdx: 0 },
  { id: 'a5',  inicioHora: 9,  inicioMin: 30, duracionMin: 60,  cliente: 'Camila Ríos',      servicio: 'Manicure',           estado: 'completada', colorEsp: 'oklch(0.58 0.155 152)', personalIdx: 1 },
  { id: 'a6',  inicioHora: 11, inicioMin: 0,  duracionMin: 45,  cliente: 'Lucía Paredes',    servicio: 'Pedicure',           estado: 'confirmada', colorEsp: 'oklch(0.58 0.155 152)', personalIdx: 1 },
  { id: 'a7',  inicioHora: 12, inicioMin: 30, duracionMin: 60,  cliente: 'Patricia Díaz',    servicio: 'Gel completo',        estado: 'pendiente',  colorEsp: 'oklch(0.58 0.155 152)', personalIdx: 1 },
  { id: 'a8',  inicioHora: 14, inicioMin: 30, duracionMin: 90,  cliente: 'Elena Mora',       servicio: 'Manicure + pedicure', estado: 'confirmada', colorEsp: 'oklch(0.58 0.155 152)', personalIdx: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearFecha(d: Date): string {
  const str = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function esHoy(d: Date): boolean {
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString();
}

function topDesdeComienzo(hora: number, min: number): number {
  return ((hora - HORA_INICIO) + min / 60) * PX_POR_HORA;
}

function alturaPorDuracion(minutos: number): number {
  return Math.max(36, (minutos / 60) * PX_POR_HORA);
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function CitaBloque({ cita }: { cita: CitaAgenda }) {
  const cfg = ESTADO_CFG[cita.estado];
  const top = topDesdeComienzo(cita.inicioHora, cita.inicioMin);
  const altura = alturaPorDuracion(cita.duracionMin);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 4,
        right: 4,
        height: altura,
        borderRadius: 'var(--radius-base)',
        borderLeft: `3px solid ${cita.colorEsp}`,
        background: 'white',
        boxShadow: 'var(--shadow-sm)',
        padding: '6px 8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-base)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--ink-strong)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cita.cliente}
      </div>
      {altura >= 48 && (
        <div
          style={{
            fontSize: 'var(--text-2xs)',
            color: 'var(--ink-muted)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cita.servicio}
        </div>
      )}
      {altura >= 60 && (
        <span
          style={{
            display: 'inline-flex',
            marginTop: 4,
            padding: '2px 6px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 500,
            color: cfg.color,
            background: cfg.bg,
          }}
        >
          {cfg.label}
        </span>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [fecha, setFecha] = useState(new Date());
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const navDia = (dir: 1 | -1) => {
    setFecha((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + dir);
      return d;
    });
  };

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', height: '100%' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {([-1, 1] as const).map((dir) => (
            <motion.button
              key={dir}
              onClick={() => navDia(dir)}
              whileTap={{ scale: 0.97 }}
              aria-label={dir === -1 ? 'Día anterior' : 'Día siguiente'}
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'white',
                color: 'var(--ink-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {dir === -1 ? <ChevronLeft size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
            </motion.button>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--ink-strong)',
              letterSpacing: 'var(--tracking-tight)',
              margin: 0,
            }}
          >
            {formatearFecha(fecha)}
          </h1>
          {!esHoy(fecha) && (
            <button
              onClick={() => setFecha(new Date())}
              style={{
                marginTop: 2,
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 500,
              }}
            >
              Ir a hoy
            </button>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-base)',
            background: 'var(--accent)',
            color: 'var(--accent-foreground)',
            border: 'none',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2} />
          Nueva cita
        </motion.button>
      </div>

      {/* Grid */}
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'auto',
          flex: 1,
        }}
      >
        {/* Cabecera especialistas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px repeat(2, 1fr)',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 10,
          }}
        >
          <div />
          {ESPECIALISTAS.map((esp) => (
            <div
              key={esp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderLeft: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-full)',
                  background: esp.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {esp.iniciales}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)' }}>
                  {esp.nombre}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                  {esp.especialidad}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cuerpo del grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(2, 1fr)' }}>
          {/* Columna de horas */}
          <div>
            {horas.map((h) => (
              <div
                key={h}
                style={{
                  height: PX_POR_HORA,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: 'var(--space-2)',
                  paddingTop: 'var(--space-1)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--ink-subtle)',
                    fontFamily: 'monospace',
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de especialistas */}
          {ESPECIALISTAS.map((esp, espIdx) => (
            <div
              key={esp.id}
              style={{
                position: 'relative',
                height: TOTAL_PX,
                borderLeft: '1px solid var(--border-subtle)',
              }}
            >
              {/* Líneas de hora */}
              {horas.map((h) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: (h - HORA_INICIO) * PX_POR_HORA,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'var(--border-subtle)',
                  }}
                />
              ))}

              {/* Citas */}
              {CITAS.filter((c) => c.personalIdx === espIdx).map((cita) => (
                <CitaBloque key={cita.id} cita={cita} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
