import { useState } from 'react';
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
  // Leer refs durante el render está prohibido (react-hooks/refs) — un estado con
  // inicializador perezoso da el mismo "calculado una sola vez" sin ese problema.
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    <div className="min-h-screen bg-surface-bg flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-border-subtle px-6 py-3 flex items-center gap-4">
        <div className="text-lg font-bold text-accent tracking-tight">
          Eunoia
        </div>
        <div className="flex-1">
          <span className="text-sm text-ink-muted">Mi Agenda</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-ink-strong">{nombre ?? 'Trabajadora'}</div>
            <div className="text-xs text-ink-muted">Trabajadora</div>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-8 h-8 rounded-lg border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer"
          >
            <LogOut size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex-1 p-6 flex flex-col gap-5 max-w-[800px] mx-auto w-full"
      >
        {/* Header navegación */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {([-1, 1] as const).map((dir) => (
              <motion.button
                key={dir}
                onClick={() => navDia(dir)}
                whileTap={{ scale: 0.97 }}
                className="w-8 h-8 rounded-full border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer"
              >
                {dir === -1 ? <ChevronLeft size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
              </motion.button>
            ))}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-ink-strong tracking-tight m-0">
              {formatearFecha(fecha)}
            </h1>
            {!esHoy(fecha) && (
              <button
                onClick={() => setFecha(new Date())}
                className="mt-0.5 text-xs text-accent bg-transparent border-none cursor-pointer p-0 font-medium"
              >
                Ir a hoy
              </button>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            Nueva cita
          </motion.button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total hoy',    valor: stats.total,       colorCls: 'text-ink-strong', bgCls: 'bg-white' },
            { label: 'Completadas',  valor: stats.completadas,  colorCls: 'text-success',    bgCls: 'bg-success-light' },
            { label: 'En curso',     valor: stats.enCurso,      colorCls: 'text-accent',     bgCls: 'bg-accent-subtle' },
          ].map(({ label, valor, colorCls, bgCls }) => (
            <div key={label} className={`${bgCls} rounded-2xl py-3 px-5 border border-border-subtle min-w-[100px]`}>
              <div className={`text-2xl font-bold ${colorCls} tracking-tight`}>{valor}</div>
              <div className="text-xs text-ink-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Grid de tiempo */}
        <div className="bg-white rounded-3xl shadow-sm overflow-auto flex-1">
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr' }}>
            {/* Horas */}
            <div>
              {horas.map((h) => (
                <div
                  key={h}
                  style={{ height: PX_POR_HORA }}
                  className="flex items-start justify-end pr-2 pt-1 border-t border-border-subtle"
                >
                  <span className="text-2xs text-ink-subtle font-mono">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Columna citas */}
            <div style={{ position: 'relative', height: TOTAL_PX }} className="border-l border-border-subtle">
              {horas.map((h) => (
                <div
                  key={h}
                  style={{ position: 'absolute', top: (h - HORA_INICIO) * PX_POR_HORA, left: 0, right: 0, height: 1 }}
                  className="bg-border-subtle"
                />
              ))}
              {CITAS.map((cita) => {
                const cfg = ESTADO_CFG[cita.estado];
                const top = topDesdeComienzo(cita.inicioHora, cita.inicioMin);
                const altura = alturaPorDuracion(cita.duracionMin);
                return (
                  <div
                    key={cita.id}
                    style={{
                      position: 'absolute', top, left: 4, right: 4, height: altura,
                      borderLeft: `3px solid ${cfg.color}`,
                      background: cfg.bg,
                    }}
                    className="rounded-lg px-2 py-1.5 overflow-hidden cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-ink-strong whitespace-nowrap overflow-hidden text-ellipsis">
                      {cita.cliente}
                    </div>
                    {altura >= 48 && (
                      <div className="text-2xs text-ink-muted mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        {cita.servicio}
                      </div>
                    )}
                    {altura >= 60 && (
                      <span
                        style={{ color: cfg.color }}
                        className="inline-flex mt-1 px-1.5 py-0.5 rounded-full text-2xs font-medium bg-white"
                      >
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
