import { useRef, useState } from 'react';
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
  { id: 'hc1', servicio: 'Corte clásico',    especialista: 'Sofía Martínez',  iniciales: 'SM', colorEsp: 'oklch(0.67 0.158 285)', fecha: '10 jun 2026', hora: '10:00', duracionMin: 45,  precio: 70,  deposito: 30, estado: 'completada'      },
  { id: 'hc2', servicio: 'Tratamiento capilar', especialista: 'Sofía Martínez', iniciales: 'SM', colorEsp: 'oklch(0.67 0.158 285)', fecha: '3 jun 2026',  hora: '09:00', duracionMin: 60,  precio: 110, deposito: 40, estado: 'completada'      },
  { id: 'hc3', servicio: 'Gel completo',      especialista: 'Andrea López',   iniciales: 'AL', colorEsp: 'oklch(0.58 0.155 152)', fecha: '28 may 2026', hora: '14:00', duracionMin: 90,  precio: 85,  deposito: 30, estado: 'completada'      },
  { id: 'hc4', servicio: 'Facial rejuvenecedor', especialista: 'Karla Fuentes', iniciales: 'KF', colorEsp: 'oklch(0.57 0.21 22)',  fecha: '20 may 2026', hora: '16:00', duracionMin: 75,  precio: 140, deposito: 50, estado: 'cancelada_tardia' },
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
      style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: cita.colorEsp, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>
          {cita.iniciales}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)' }}>{cita.servicio}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{cita.especialista}</div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: cfg.color, background: cfg.bg, flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--ink-muted)' }}>
          <Calendar size={12} strokeWidth={1.5} />
          <span style={{ fontSize: 'var(--text-xs)' }}>{cita.fecha}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--ink-muted)' }}>
          <Clock size={12} strokeWidth={1.5} />
          <span style={{ fontSize: 'var(--text-xs)' }}>{cita.hora} · {cita.duracionMin} min</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
          S/ {cita.precio} <span style={{ color: 'var(--ink-subtle)' }}>(depósito S/ {cita.deposito})</span>
        </div>
      </div>

      {cancelable && onCancelar && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCancelar}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--error)', fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer' }}
        >
          <X size={11} strokeWidth={2} />
          Cancelar cita
        </motion.button>
      )}
    </motion.div>
  );
}

export default function ClienteCitas() {
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const nombre = useAuthStore((s) => s.usuario?.nombre_completo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const navigate = useNavigate();
  const [proximas, setProximas] = useState(PROXIMAS);

  const cancelar = (id: string) => {
    setProximas((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-3) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--accent)', letterSpacing: 'var(--tracking-tight)' }}>Eunoia</div>
        <div style={{ flex: 1 }} />
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/cliente/reservar')}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-base)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={13} strokeWidth={2} />
          Reservar
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>{nombre ?? 'Clienta'}</span>
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
        style={{ flex: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', maxWidth: 680, margin: '0 auto', width: '100%' }}
      >
        {/* Próximas */}
        <section>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 var(--space-4)' }}>
            Próximas citas
          </h2>
          {proximas.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', padding: 'var(--space-10)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4)' }}>No tienes citas próximas.</p>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/cliente/reservar')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-base)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={13} strokeWidth={2} />
                Reservar ahora
              </motion.button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 var(--space-4)' }}>
            Historial
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {HISTORIAL.map((c) => (
              <CitaCard key={c.id} cita={c} />
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
