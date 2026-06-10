import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { EstadoCita } from '@/types';

const HORA_INICIO = 8;
const HORA_FIN = 19;
const PX_POR_HORA = 64;
const TOTAL_PX = (HORA_FIN - HORA_INICIO) * PX_POR_HORA;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ESTADO_CFG: Record<EstadoCita, { label: string; color: string; bg: string }> = {
  pendiente:        { label: 'Pendiente',       color: 'var(--estado-pendiente)',         bg: 'var(--estado-pendiente-bg)'        },
  confirmada:       { label: 'Confirmada',       color: 'var(--estado-confirmada)',        bg: 'var(--estado-confirmada-bg)'       },
  en_curso:         { label: 'En curso',         color: 'var(--estado-en-curso)',          bg: 'var(--estado-en-curso-bg)'         },
  completada:       { label: 'Completada',       color: 'var(--estado-completada)',        bg: 'var(--estado-completada-bg)'       },
  cancelada:        { label: 'Cancelada',        color: 'var(--estado-cancelada)',         bg: 'var(--estado-cancelada-bg)'        },
  cancelada_tardia: { label: 'Cancelada tardía', color: 'var(--estado-cancelada-tardia)', bg: 'var(--estado-cancelada-tardia-bg)' },
  no_show:          { label: 'No show',          color: 'var(--estado-no-show)',           bg: 'var(--estado-no-show-bg)'          },
};

interface CitaWorker {
  id: string;
  inicioHora: number;
  inicioMin: number;
  duracionMin: number;
  cliente: string;
  servicio: string;
  estado: EstadoCita;
}

const CITAS: CitaWorker[] = [
  { id: 'w1', inicioHora: 9,  inicioMin: 0,  duracionMin: 90,  cliente: 'Valentina Torres', servicio: 'Corte y color',       estado: 'completada' },
  { id: 'w2', inicioHora: 11, inicioMin: 0,  duracionMin: 60,  cliente: 'Daniela Cruz',     servicio: 'Tratamiento capilar', estado: 'en_curso'   },
  { id: 'w3', inicioHora: 13, inicioMin: 0,  duracionMin: 90,  cliente: 'Rosa Medina',      servicio: 'Alisado keratina',    estado: 'confirmada' },
  { id: 'w4', inicioHora: 15, inicioMin: 30, duracionMin: 60,  cliente: 'Mariana Vega',     servicio: 'Corte',               estado: 'pendiente'  },
  { id: 'w5', inicioHora: 17, inicioMin: 0,  duracionMin: 45,  cliente: 'Carmen Santos',    servicio: 'Corte clásico',       estado: 'pendiente'  },
];

function topDesdeComienzo(hora: number, min: number) {
  return ((hora - HORA_INICIO) + min / 60) * PX_POR_HORA;
}
function alturaPorDuracion(min: number) {
  return Math.max(36, (min / 60) * PX_POR_HORA);
}
function formatearFecha(d: Date) {
  const s = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function esHoy(d: Date) {
  return d.toDateString() === new Date().toDateString();
}

export default function TrabajadorAgenda() {
  const [fecha, setFecha] = useState(new Date());
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const nombre = useAuthStore((s) => s.usuario?.nombre_completo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  const navDia = (dir: 1 | -1) => {
    setFecha((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + dir);
      return d;
    });
  };

  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);

  const stats = {
    total: CITAS.length,
    completadas: CITAS.filter((c) => c.estado === 'completada').length,
    enCurso: CITAS.filter((c) => c.estado === 'en_curso').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-3) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--accent)', letterSpacing: 'var(--tracking-tight)' }}>
          Eunoia
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>Mi Agenda</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)' }}>{nombre ?? 'Trabajadora'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>Trabajadora</div>
          </div>
          <button onClick={cerrarSesion}
            style={{ width: 32, height: 32, borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <LogOut size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        style={{ flex: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 800, margin: '0 auto', width: '100%' }}
      >
        {/* Header navegación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {([-1, 1] as const).map((dir) => (
              <motion.button key={dir} onClick={() => navDia(dir)} whileTap={{ scale: 0.97 }}
                style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {dir === -1 ? <ChevronLeft size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
              </motion.button>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
              {formatearFecha(fecha)}
            </h1>
            {!esHoy(fecha) && (
              <button onClick={() => setFecha(new Date())}
                style={{ marginTop: 2, fontSize: 'var(--text-xs)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                Ir a hoy
              </button>
            )}
          </div>
          <motion.button whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-base)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2} />
            Nueva cita
          </motion.button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {[
            { label: 'Total hoy',    valor: stats.total,       color: 'var(--ink-strong)', bg: 'white' },
            { label: 'Completadas',  valor: stats.completadas,  color: 'var(--success)',    bg: 'var(--success-light)' },
            { label: 'En curso',     valor: stats.enCurso,      color: 'var(--accent)',     bg: 'var(--accent-subtle)' },
          ].map(({ label, valor, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 'var(--radius-xl)', padding: 'var(--space-3) var(--space-5)', border: '1px solid var(--border-subtle)', minWidth: 100 }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color, letterSpacing: 'var(--tracking-tight)' }}>{valor}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Grid de tiempo */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr' }}>
            {/* Horas */}
            <div>
              {horas.map((h) => (
                <div key={h} style={{ height: PX_POR_HORA, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 'var(--space-2)', paddingTop: 'var(--space-1)', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-subtle)', fontFamily: 'monospace' }}>
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Columna citas */}
            <div style={{ position: 'relative', height: TOTAL_PX, borderLeft: '1px solid var(--border-subtle)' }}>
              {horas.map((h) => (
                <div key={h} style={{ position: 'absolute', top: (h - HORA_INICIO) * PX_POR_HORA, left: 0, right: 0, height: 1, background: 'var(--border-subtle)' }} />
              ))}
              {CITAS.map((cita) => {
                const cfg = ESTADO_CFG[cita.estado];
                const top = topDesdeComienzo(cita.inicioHora, cita.inicioMin);
                const altura = alturaPorDuracion(cita.duracionMin);
                return (
                  <div key={cita.id}
                    style={{ position: 'absolute', top, left: 4, right: 4, height: altura, borderRadius: 'var(--radius-base)', borderLeft: `3px solid ${cfg.color}`, background: cfg.bg, padding: '6px 8px', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cita.cliente}
                    </div>
                    {altura >= 48 && (
                      <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cita.servicio}
                      </div>
                    )}
                    {altura >= 60 && (
                      <span style={{ display: 'inline-flex', marginTop: 4, padding: '2px 6px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 500, color: cfg.color, background: 'white' }}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
