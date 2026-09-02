import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, LogOut, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import type { EstadoCita } from '@/types';

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

interface ICitaCliente {
  id: string;
  servicio: string;
  especialista: string;
  iniciales: string;
  colorEsp: string;
  fecha: string;
  hora: string;
  duracionMin: number;
  precio: number;
  deposito: number;
  estado: EstadoCita;
}

const PROXIMAS: ICitaCliente[] = [
  { id: 'pc1', servicio: 'Color completo',    especialista: 'Sofía Martínez',  iniciales: 'SM', colorEsp: 'oklch(0.67 0.158 285)', fecha: '15 jun 2026', hora: '11:00', duracionMin: 120, precio: 180, deposito: 60, estado: 'confirmada' },
  { id: 'pc2', servicio: 'Manicure + pedicure', especialista: 'Andrea López', iniciales: 'AL', colorEsp: 'oklch(0.58 0.155 152)', fecha: '22 jun 2026', hora: '15:30', duracionMin: 110, precio: 100, deposito: 40, estado: 'pendiente'  },
];

const HISTORIAL: ICitaCliente[] = [
  { id: 'hc1', servicio: 'Corte clásico',       especialista: 'Sofía Martínez',  iniciales: 'SM', colorEsp: 'oklch(0.67 0.158 285)', fecha: '10 jun 2026', hora: '10:00', duracionMin: 45,  precio: 70,  deposito: 30, estado: 'completada'      },
  { id: 'hc2', servicio: 'Tratamiento capilar',  especialista: 'Sofía Martínez',  iniciales: 'SM', colorEsp: 'oklch(0.67 0.158 285)', fecha: '3 jun 2026',  hora: '09:00', duracionMin: 60,  precio: 110, deposito: 40, estado: 'completada'      },
  { id: 'hc3', servicio: 'Gel completo',         especialista: 'Andrea López',    iniciales: 'AL', colorEsp: 'oklch(0.58 0.155 152)', fecha: '28 may 2026', hora: '14:00', duracionMin: 90,  precio: 85,  deposito: 30, estado: 'completada'      },
  { id: 'hc4', servicio: 'Facial rejuvenecedor', especialista: 'Karla Fuentes',   iniciales: 'KF', colorEsp: 'oklch(0.57 0.21 22)',   fecha: '20 may 2026', hora: '16:00', duracionMin: 75,  precio: 140, deposito: 50, estado: 'cancelada_tardia' },
];

function CitaCard({ cita, onCancelar }: { cita: ICitaCliente; onCancelar?: () => void }) {
  const cfg = ESTADO_CFG[cita.estado];
  const cancelable = cita.estado === 'pendiente' || cita.estado === 'confirmada';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div
          style={{ background: cita.colorEsp }}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
        >
          {cita.iniciales}
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-ink-strong">{cita.servicio}</div>
          <div className="text-xs text-ink-muted mt-0.5">{cita.especialista}</div>
        </div>
        <span
          style={{ color: cfg.color, background: cfg.bg }}
          className="py-0.5 px-2.5 rounded-full text-2xs font-semibold shrink-0"
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex gap-4 flex-wrap border-t border-border-subtle pt-3">
        <div className="flex items-center gap-1 text-ink-muted">
          <Calendar size={12} strokeWidth={1.5} />
          <span className="text-xs">{cita.fecha}</span>
        </div>
        <div className="flex items-center gap-1 text-ink-muted">
          <Clock size={12} strokeWidth={1.5} />
          <span className="text-xs">{cita.hora} · {cita.duracionMin} min</span>
        </div>
        <div className="ml-auto text-xs text-ink-muted">
          S/ {cita.precio} <span className="text-ink-subtle">(depósito S/ {cita.deposito})</span>
        </div>
      </div>

      {cancelable && onCancelar && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCancelar}
          className="self-start flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border-subtle bg-white text-error text-xs font-medium cursor-pointer"
        >
          <X size={11} strokeWidth={2} />
          Cancelar cita
        </motion.button>
      )}
    </motion.div>
  );
}

export default function ClienteCitas() {
  // Leer refs durante el render está prohibido (react-hooks/refs) — un estado con
  // inicializador perezoso da el mismo "calculado una sola vez" sin ese problema.
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nombre = useAuthStore((s) => s.usuario?.nombre_completo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const navigate = useNavigate();
  const [proximas, setProximas] = useState(PROXIMAS);

  const cancelar = (id: string) => {
    setProximas((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-border-subtle px-6 py-3 flex items-center gap-4">
        <div className="text-lg font-bold text-accent tracking-tight">Eunoia</div>
        <div className="flex-1" />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/cliente/reservar')}
          className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer"
        >
          <Plus size={13} strokeWidth={2} />
          Reservar
        </motion.button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{nombre ?? 'Clienta'}</span>
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
        className="flex-1 p-6 flex flex-col gap-8 max-w-[680px] mx-auto w-full"
      >
        {/* Próximas */}
        <section>
          <h2 className="text-lg font-bold text-ink-strong tracking-tight m-0 mb-4">
            Próximas citas
          </h2>
          {proximas.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <p className="text-ink-muted text-sm m-0 mb-4">No tienes citas próximas.</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/cliente/reservar')}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer"
              >
                <Plus size={13} strokeWidth={2} />
                Reservar ahora
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {proximas.map((c) => (
                  <CitaCard key={c.id} cita={c} onCancelar={() => cancelar(c.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Historial */}
        <section>
          <h2 className="text-lg font-bold text-ink-strong tracking-tight m-0 mb-4">
            Historial
          </h2>
          <div className="flex flex-col gap-3">
            {HISTORIAL.map((c) => (
              <CitaCard key={c.id} cita={c} />
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
