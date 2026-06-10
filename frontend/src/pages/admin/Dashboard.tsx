import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
  TrendingUp,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { EstadoCita } from '@/types';

// ─── Tokens de estado ─────────────────────────────────────────────────────────

const ESTADO_CFG: Record<EstadoCita, { label: string; color: string; bg: string }> = {
  pendiente:        { label: 'Pendiente',        color: 'var(--estado-pendiente)',         bg: 'var(--estado-pendiente-bg)' },
  confirmada:       { label: 'Confirmada',       color: 'var(--estado-confirmada)',        bg: 'var(--estado-confirmada-bg)' },
  en_curso:         { label: 'En curso',         color: 'var(--estado-en-curso)',          bg: 'var(--estado-en-curso-bg)' },
  completada:       { label: 'Completada',       color: 'var(--estado-completada)',        bg: 'var(--estado-completada-bg)' },
  cancelada:        { label: 'Cancelada',        color: 'var(--estado-cancelada)',         bg: 'var(--estado-cancelada-bg)' },
  cancelada_tardia: { label: 'Cancelada tardía', color: 'var(--estado-cancelada-tardia)', bg: 'var(--estado-cancelada-tardia-bg)' },
  no_show:          { label: 'No show',          color: 'var(--estado-no-show)',           bg: 'var(--estado-no-show-bg)' },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CitaTabla {
  id: string;
  hora: string;
  cliente: string;
  iniciales: string;
  servicio: string;
  especialista: string;
  estado: EstadoCita;
}

interface CitaCalendario {
  id: string;
  hora: string;
  cliente: string;
  servicio: string;
  estado: EstadoCita;
}

interface PagoPendiente {
  id: string;
  cliente: string;
  servicio: string;
  monto: number;
  metodo: 'yape' | 'plin' | 'efectivo' | 'transferencia' | 'tarjeta';
}

interface Actividad {
  id: string;
  texto: string;
  hace: string;
  color: string;
  Icono: React.ElementType;
}

interface ClienteNuevo {
  id: string;
  nombre: string;
  iniciales: string;
  canal: string;
  fecha: string;
  etiquetas: string[];
}

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const CITAS_HOY: CitaTabla[] = [
  { id: '1', hora: '09:00', cliente: 'Valentina Torres', iniciales: 'VT', servicio: 'Corte y color',      especialista: 'Sofía M.',  estado: 'completada' },
  { id: '2', hora: '10:30', cliente: 'Camila Ríos',      iniciales: 'CR', servicio: 'Manicure',           especialista: 'Andrea L.', estado: 'en_curso'   },
  { id: '3', hora: '12:00', cliente: 'Daniela Cruz',     iniciales: 'DC', servicio: 'Tratamiento capilar',especialista: 'Sofía M.',  estado: 'confirmada' },
  { id: '4', hora: '14:00', cliente: 'Lucía Paredes',    iniciales: 'LP', servicio: 'Pedicure',           especialista: 'Andrea L.', estado: 'pendiente'  },
  { id: '5', hora: '15:30', cliente: 'Mariana Vega',     iniciales: 'MV', servicio: 'Alisado',            especialista: 'Sofía M.',  estado: 'confirmada' },
];

const CITAS_CALENDARIO: Record<string, CitaCalendario[]> = {
  '2026-06-03': [
    { id: 'c1',  hora: '10:00', cliente: 'Ana García',       servicio: 'Corte clásico',  estado: 'completada' },
  ],
  '2026-06-07': [
    { id: 'c2',  hora: '09:30', cliente: 'María López',      servicio: 'Manicure',        estado: 'confirmada' },
    { id: 'c3',  hora: '12:00', cliente: 'Patricia Díaz',    servicio: 'Pedicure',        estado: 'pendiente'  },
  ],
  '2026-06-10': [
    { id: 'c4',  hora: '09:00', cliente: 'Valentina Torres', servicio: 'Corte y color',   estado: 'completada' },
    { id: 'c5',  hora: '10:30', cliente: 'Camila Ríos',      servicio: 'Manicure',        estado: 'en_curso'   },
    { id: 'c6',  hora: '12:00', cliente: 'Daniela Cruz',     servicio: 'Tratamiento',     estado: 'confirmada' },
    { id: 'c7',  hora: '14:00', cliente: 'Lucía Paredes',    servicio: 'Pedicure',        estado: 'pendiente'  },
  ],
  '2026-06-15': [
    { id: 'c8',  hora: '10:00', cliente: 'Rosa Medina',      servicio: 'Facial premium',  estado: 'confirmada' },
    { id: 'c9',  hora: '11:30', cliente: 'Carmen Santos',    servicio: 'Alisado',         estado: 'confirmada' },
    { id: 'c10', hora: '13:00', cliente: 'Isabel Flores',    servicio: 'Color completo',  estado: 'no_show'    },
  ],
  '2026-06-17': [
    { id: 'c11', hora: '09:00', cliente: 'Elena Mora',       servicio: 'Depilación',      estado: 'pendiente'  },
    { id: 'c12', hora: '11:00', cliente: 'Laura Vega',       servicio: 'Tratamiento',     estado: 'cancelada'  },
  ],
  '2026-06-22': [
    { id: 'c13', hora: '10:30', cliente: 'Gabriela Luna',    servicio: 'Manicure',        estado: 'completada' },
  ],
  '2026-06-28': [
    { id: 'c14', hora: '09:00', cliente: 'Sofía Ruiz',       servicio: 'Corte y color',   estado: 'confirmada' },
    { id: 'c15', hora: '11:00', cliente: 'Diana Paz',        servicio: 'Pedicure',        estado: 'pendiente'  },
  ],
};

const PAGOS_PENDIENTES: PagoPendiente[] = [
  { id: 'p1', cliente: 'Daniela Cruz',     servicio: 'Tratamiento capilar', monto: 85,  metodo: 'yape' },
  { id: 'p2', cliente: 'Lucía Paredes',    servicio: 'Pedicure',            monto: 50,  metodo: 'efectivo' },
  { id: 'p3', cliente: 'Valentina Torres', servicio: 'Corte y color',       monto: 130, metodo: 'transferencia' },
];

const ACTIVIDAD: Actividad[] = [
  { id: 'a1', texto: 'Nueva cita — Daniela Cruz · 12:00',      hace: 'hace 5 min',  color: 'var(--accent)',  Icono: CalendarDays },
  { id: 'a2', texto: 'Pago confirmado — S/ 130 (Valentina)',    hace: 'hace 23 min', color: 'var(--success)', Icono: CreditCard   },
  { id: 'a3', texto: 'Nueva clienta — Rosa Medina',             hace: 'hace 1h',     color: 'var(--info)',    Icono: UserPlus     },
  { id: 'a4', texto: 'No-show — Mariana Vega · 09:15',         hace: 'hace 2h',     color: 'var(--error)',   Icono: UserX        },
  { id: 'a5', texto: 'Cita completada — Sofía Ruiz · Manicure', hace: 'hace 3h',    color: 'var(--success)', Icono: CalendarDays },
];

const CLIENTES_NUEVOS: ClienteNuevo[] = [
  { id: 'cn1', nombre: 'Rosa Medina',    iniciales: 'RM', canal: 'WhatsApp',  fecha: 'hoy',   etiquetas: ['vip'] },
  { id: 'cn2', nombre: 'Laura Vega',     iniciales: 'LV', canal: 'Referida',  fecha: 'ayer',  etiquetas: [] },
  { id: 'cn3', nombre: 'Isabel Flores',  iniciales: 'IF', canal: 'Instagram', fecha: 'lun',   etiquetas: ['nueva'] },
  { id: 'cn4', nombre: 'Elena Mora',     iniciales: 'EM', canal: 'WhatsApp',  fecha: 'dom',   etiquetas: ['fidelizada'] },
  { id: 'cn5', nombre: 'Gabriela Luna',  iniciales: 'GL', canal: 'Web',       fecha: 'sáb',   etiquetas: [] },
];

const ETIQUETA_CFG: Record<string, { label: string; color: string; bg: string }> = {
  vip:        { label: 'VIP',        color: 'oklch(0.52 0.14 68)',   bg: 'var(--warning-light)' },
  nueva:      { label: 'Nueva',      color: 'var(--info)',            bg: 'var(--info-light)' },
  fidelizada: { label: 'Fidelizada', color: 'var(--success)',         bg: 'var(--success-light)' },
};

const METODO_LABEL: Record<PagoPendiente['metodo'], string> = {
  yape: 'Yape', plin: 'Plin', efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta',
};

// ─── Animaciones ──────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const variantesGrid = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function variantesTarjeta(reducedMotion: boolean) {
  return {
    oculto: { opacity: 0, y: reducedMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function obtenerSaludo(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function obtenerFechaCorta(): string {
  const str = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function obtenerIniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}


// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Badge({ estado }: { estado: EstadoCita }) {
  const cfg = ESTADO_CFG[estado];
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15, ease: EASE }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px var(--space-2)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </motion.span>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: '0 1px 4px oklch(0.12 0.038 288 / 0.06), 0 4px 20px oklch(0.12 0.038 288 / 0.06)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-5) var(--space-5) 0',
        marginBottom: 'var(--space-4)',
      }}
    >
      {children}
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

interface KpiProps {
  titulo: string;
  valor: string;
  tendencia: string;
  positivo: boolean;
  Icono: React.ElementType;
  colorIcono: string;
  bgIcono: string;
  variante: ReturnType<typeof variantesTarjeta>;
}

function KpiCard({ titulo, valor, tendencia, positivo, Icono, colorIcono, bgIcono, variante }: KpiProps) {
  return (
    <motion.div
      variants={variante}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: '0 1px 4px oklch(0.12 0.038 288 / 0.06), 0 4px 20px oklch(0.12 0.038 288 / 0.06)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-lg)',
            background: bgIcono,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colorIcono,
            flexShrink: 0,
          }}
        >
          <Icono size={18} strokeWidth={1.5} />
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            color: positivo ? 'var(--success)' : 'var(--error)',
            background: positivo ? 'var(--success-light)' : 'var(--error-light)',
            padding: '3px 7px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <ArrowUpRight size={11} strokeWidth={2} style={{ transform: positivo ? 'none' : 'rotate(90deg)' }} />
          {tendencia}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            color: 'var(--ink-strong)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          {valor}
        </div>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--ink-muted)',
            marginTop: 'var(--space-1)',
          }}
        >
          {titulo}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Calendario semanal ───────────────────────────────────────────────────────

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

function generarDias(año: number, mes: number): { fecha: Date; esMes: boolean }[] {
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const inicio = (primerDia.getDay() + 6) % 7;
  const total = Math.ceil((inicio + ultimoDia.getDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(año, mes, 1 - inicio + i);
    return { fecha: d, esMes: d.getMonth() === mes };
  });
}

function formatClave(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CalendarioMensual() {
  const hoy = new Date();
  const [{ año, mes }, setMes] = useState({ año: hoy.getFullYear(), mes: hoy.getMonth() });
  const [dir, setDir] = useState<1 | -1>(1);
  const [diaHover, setDiaHover] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number; arriba: boolean } | null>(null);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const dias = generarDias(año, mes);
  const tituloRaw = new Date(año, mes, 1).toLocaleString('es-PE', { month: 'long', year: 'numeric' });
  const titulo = tituloRaw.charAt(0).toUpperCase() + tituloRaw.slice(1);

  const navMes = (d: 1 | -1) => {
    setDir(d);
    setMes(({ año: a, mes: m }) => {
      const nm = m + d;
      if (nm > 11) return { año: a + 1, mes: 0 };
      if (nm < 0)  return { año: a - 1, mes: 11 };
      return { año: a, mes: nm };
    });
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>, clave: string) => {
    if (!CITAS_CALENDARIO[clave]?.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const arriba = window.innerHeight - r.bottom < 240;
    setDiaHover(clave);
    setPopoverPos({
      x: Math.max(8, Math.min(r.left - 10, window.innerWidth - 290)),
      y: arriba ? r.top - 8 : r.bottom + 8,
      arriba,
    });
  };

  const handleLeave = () => {
    setDiaHover(null);
    setPopoverPos(null);
  };

  const slideVariants = reducedMotion
    ? {
        oculto:  { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.22, ease: EASE } },
        salida:  { opacity: 0, transition: { duration: 0.22, ease: EASE } },
      }
    : {
        oculto:  (d: number) => ({ opacity: 0, x: `${d * 100}%` }),
        visible: { opacity: 1, x: '0%', transition: { duration: 0.22, ease: EASE } },
        salida:  (d: number) => ({ opacity: 0, x: `${d * -100}%`, transition: { duration: 0.22, ease: EASE } }),
      };

  const citasPopover = diaHover ? (CITAS_CALENDARIO[diaHover] ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
          {titulo}
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {([-1, 1] as const).map((d) => (
            <motion.button
              key={d}
              onClick={() => navMes(d)}
              whileTap={{ scale: 0.97 }}
              aria-label={d === -1 ? 'Mes anterior' : 'Mes siguiente'}
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {d === -1 ? <ChevronLeft size={15} strokeWidth={1.5} /> : <ChevronRight size={15} strokeWidth={1.5} />}
            </motion.button>
          ))}
        </div>
      </CardHeader>

      <div style={{ padding: '0 var(--space-5) var(--space-5)', overflow: 'hidden' }}>
        {/* Cabecera L M X J V S D */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 'var(--space-2)' }}>
          {DIAS_SEMANA.map((letra) => (
            <div
              key={letra}
              style={{
                textAlign: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--ink-muted)',
                padding: 'var(--space-1) 0',
              }}
            >
              {letra}
            </div>
          ))}
        </div>

        {/* Grid con slide al navegar */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${año}-${mes}`}
            custom={dir}
            variants={slideVariants}
            initial="oculto"
            animate="visible"
            exit="salida"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}
          >
            {dias.map(({ fecha, esMes }) => {
              const clave = formatClave(fecha);
              const citas = CITAS_CALENDARIO[clave] ?? [];
              const esHoyDia = fecha.toDateString() === hoy.toDateString();
              const tieneCitas = citas.length > 0;
              const activo = diaHover === clave;
              const estadosUnicos = [...new Set(citas.map((c) => c.estado))].slice(0, 3);

              return (
                <button
                  key={clave}
                  onMouseEnter={(e) => handleHover(e, clave)}
                  onMouseLeave={handleLeave}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 36,
                    padding: '4px 2px',
                    gap: 3,
                    borderRadius: 'var(--radius-base)',
                    border: 'none',
                    background: activo && !esHoyDia && tieneCitas ? 'var(--accent-subtle)' : 'transparent',
                    cursor: tieneCitas ? 'pointer' : 'default',
                    opacity: esMes ? 1 : 0.4,
                    transition: 'background 150ms ease-out',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-sm)',
                      fontWeight: esHoyDia ? 700 : 400,
                      color: esHoyDia ? 'var(--accent-foreground)' : esMes ? 'var(--ink-base)' : 'var(--ink-subtle)',
                      background: esHoyDia ? 'oklch(0.51 0.261 286)' : 'transparent',
                      transition: 'background 150ms ease-out',
                    }}
                  >
                    {fecha.getDate()}
                  </span>
                  {tieneCitas && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {estadosUnicos.map((estado) => (
                        <div
                          key={estado}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 'var(--radius-full)',
                            background: ESTADO_CFG[estado].color,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Popover */}
      {diaHover && popoverPos && createPortal(
        <AnimatePresence>
          <motion.div
            key={diaHover}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: EASE } }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{
              position: 'fixed',
              ...(popoverPos.arriba
                ? { bottom: window.innerHeight - popoverPos.y }
                : { top: popoverPos.y }),
              left: popoverPos.x,
              minWidth: 220,
              maxWidth: 280,
              background: 'oklch(1 0 0)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px oklch(0.12 0.038 288 / 0.18)',
              zIndex: 100,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {new Date(diaHover + 'T12:00').toLocaleDateString('es-PE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </span>
            </div>
            <div style={{ padding: 'var(--space-2) 0' }}>
              {citasPopover.slice(0, 3).map((cita) => (
                <div
                  key={cita.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-4)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'monospace',
                      color: 'var(--ink-muted)',
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {cita.hora}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        color: 'var(--ink-strong)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cita.cliente}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', margin: '1px 0 0 0' }}>
                      {cita.servicio}
                    </p>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 500,
                      color: ESTADO_CFG[cita.estado].color,
                      background: ESTADO_CFG[cita.estado].bg,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {ESTADO_CFG[cita.estado].label}
                  </span>
                </div>
              ))}
              {citasPopover.length > 3 && (
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-muted)',
                    fontStyle: 'italic',
                    padding: 'var(--space-1) var(--space-4)',
                    margin: 0,
                  }}
                >
                  y {citasPopover.length - 3} más
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </Card>
  );
}

// ─── Citas de hoy ─────────────────────────────────────────────────────────────

function CitaItem({ cita }: { cita: CitaTabla }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-subtle)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {cita.iniciales}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--ink-strong)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {cita.cliente}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>
          {cita.hora} · {cita.servicio}
        </div>
      </div>
      <Badge estado={cita.estado} />
    </div>
  );
}

// ─── Pagos pendientes ─────────────────────────────────────────────────────────

function PagoItem({ pago }: { pago: PagoPendiente }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--ink-strong)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pago.cliente}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>
          {pago.servicio} · {METODO_LABEL[pago.metodo]}
        </div>
      </div>
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          color: 'var(--ink-strong)',
          flexShrink: 0,
        }}
      >
        S/ {pago.monto}
      </span>
      <button
        style={{
          padding: '5px 12px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent)',
          color: 'var(--accent-foreground)',
          border: 'none',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; }}
      >
        Confirmar
      </button>
    </div>
  );
}

// ─── Actividad reciente ───────────────────────────────────────────────────────

function TimelineItem({ act, last }: { act: Actividad; last: boolean }) {
  const { Icono } = act;
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', paddingBottom: last ? 0 : 'var(--space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-full)',
            background: 'var(--surface-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: act.color,
            border: `1.5px solid ${act.color}`,
            flexShrink: 0,
          }}
        >
          <Icono size={13} strokeWidth={1.5} />
        </div>
        {!last && (
          <div
            style={{
              width: 1,
              flex: 1,
              background: 'var(--border-subtle)',
              minHeight: 12,
              marginTop: 4,
            }}
          />
        )}
      </div>
      <div style={{ paddingTop: 4 }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)', margin: 0, lineHeight: 'var(--leading-snug)' }}>
          {act.texto}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-subtle)', margin: '3px 0 0 0' }}>
          {act.hace}
        </p>
      </div>
    </div>
  );
}

// ─── Popover para notificaciones ──────────────────────────────────────────────

function BellButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleClick = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ x: r.right - 280, y: r.bottom + 8 });
    }
    setOpen((p) => !p);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        aria-label="Notificaciones"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-full)',
          background: 'var(--surface-base)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Bell size={16} strokeWidth={1.5} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 'var(--radius-full)',
              background: 'var(--error)',
              color: 'white',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid white',
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.15, ease: EASE }}
              style={{
                position: 'fixed',
                top: pos.y,
                left: pos.x,
                width: 280,
                background: 'white',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)' }}>
                  Notificaciones
                </span>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 2, display: 'flex' }}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
              {ACTIVIDAD.slice(0, 3).map((act) => {
                const { Icono } = act;
                return (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-bg)',
                        border: `1.5px solid ${act.color}`,
                        color: act.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icono size={12} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-base)', margin: 0 }}>{act.texto}</p>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-subtle)', margin: '2px 0 0 0' }}>{act.hace}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </>,
          document.body
        )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const KPI_ITEMS = [
  { titulo: 'Citas hoy',       valor: '8',      tendencia: '+12%', positivo: true,  Icono: CalendarDays, colorIcono: 'var(--accent)',  bgIcono: 'var(--accent-subtle)' },
  { titulo: 'Ingresos del día', valor: 'S/ 380', tendencia: '+8%',  positivo: true,  Icono: TrendingUp,   colorIcono: 'var(--success)', bgIcono: 'var(--success-light)' },
  { titulo: 'Ocupación',        valor: '73%',    tendencia: '+5%',  positivo: true,  Icono: TrendingUp,   colorIcono: 'var(--info)',    bgIcono: 'var(--info-light)' },
  { titulo: 'No-shows',         valor: '2',      tendencia: '+1',   positivo: false, Icono: UserX,        colorIcono: 'var(--error)',   bgIcono: 'var(--error-light)' },
] as const;

export default function AdminDashboard() {
  const usuario = useAuthStore((s) => s.usuario);
  const prefersReducedMotion = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  const tvariante = variantesTarjeta(prefersReducedMotion);
  const iniciales = usuario ? obtenerIniciales(usuario.nombre_completo) : '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--ink-strong)',
              letterSpacing: 'var(--tracking-tight)',
              margin: 0,
              lineHeight: 'var(--leading-tight)',
            }}
          >
            {obtenerSaludo()}, {usuario?.nombre_completo?.split(' ')[0] ?? ''} 👋
          </h1>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-muted)',
              margin: '4px 0 0 0',
            }}
          >
            {obtenerFechaCorta()}
          </p>
        </div>

        {/* Búsqueda */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'white',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-2) var(--space-4)',
            width: 200,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Search size={13} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />
          <input
            placeholder="Buscar..."
            readOnly
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-base)',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--font-sans)',
              cursor: 'default',
            }}
          />
        </div>

        {/* Campana */}
        <BellButton count={3} />

        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent)',
            color: 'var(--accent-foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            flexShrink: 0,
            boxShadow: '0 0 0 2px white, 0 0 0 3.5px var(--accent)',
          }}
          title={usuario?.nombre_completo}
        >
          {iniciales}
        </div>
      </header>

      {/* ── KPI Cards ── */}
      <motion.div
        variants={variantesGrid}
        initial="oculto"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {KPI_ITEMS.map((kpi) => (
          <KpiCard key={kpi.titulo} {...kpi} variante={tvariante} />
        ))}
      </motion.div>

      {/* ── Calendario semanal + Citas hoy ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        <CalendarioMensual />

        <Card>
          <CardHeader>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
              Citas de hoy
            </h3>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              {CITAS_HOY.length}
            </span>
          </CardHeader>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {CITAS_HOY.map((cita) => (
              <CitaItem key={cita.id} cita={cita} />
            ))}
          </div>
        </Card>
      </div>

      {/* ── Pagos + Actividad + Clientes ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        {/* Pagos pendientes */}
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
              Pagos pendientes
            </h3>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--warning-light)',
                color: 'var(--warning)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              {PAGOS_PENDIENTES.length}
            </span>
          </CardHeader>
          <div>
            {PAGOS_PENDIENTES.map((pago) => (
              <PagoItem key={pago.id} pago={pago} />
            ))}
          </div>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
              Actividad reciente
            </h3>
          </CardHeader>
          <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
            {ACTIVIDAD.map((act, i) => (
              <TimelineItem key={act.id} act={act} last={i === ACTIVIDAD.length - 1} />
            ))}
          </div>
        </Card>

        {/* Clientes nuevos */}
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
              Clientes nuevas
            </h3>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--text-xs)',
                color: 'var(--success)',
                fontWeight: 500,
              }}
            >
              <ArrowUpRight size={12} strokeWidth={2} />
              esta semana
            </span>
          </CardHeader>
          <div style={{ padding: '0 var(--space-5) var(--space-4)' }}>
            {CLIENTES_NUEVOS.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) 0',
                  borderBottom: i < CLIENTES_NUEVOS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {c.iniciales}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink-strong)' }}>
                    {c.nombre}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>
                    {c.canal} · {c.fecha}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {c.etiquetas.map((e) => {
                    const cfg = ETIQUETA_CFG[e];
                    if (!cfg) return null;
                    return (
                      <span
                        key={e}
                        style={{
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-2xs)',
                          fontWeight: 600,
                          color: cfg.color,
                          background: cfg.bg,
                        }}
                      >
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
