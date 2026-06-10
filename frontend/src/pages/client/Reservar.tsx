import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, LogOut, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Datos estáticos ──────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'cat1', nombre: 'Cabello',       emoji: '✂️' },
  { id: 'cat2', nombre: 'Uñas',          emoji: '💅' },
  { id: 'cat3', nombre: 'Tratamientos',  emoji: '🌿' },
];

const SERVICIOS = [
  { id: 's1', catId: 'cat1', nombre: 'Corte clásico',       descripcion: 'Corte en seco o húmedo', duracionMin: 45,  precio: 70,  deposito: 30 },
  { id: 's2', catId: 'cat1', nombre: 'Color completo',       descripcion: 'Tinte raíz + extensión', duracionMin: 120, precio: 180, deposito: 60 },
  { id: 's3', catId: 'cat1', nombre: 'Alisado keratina',     descripcion: 'Duración 4–6 meses',     duracionMin: 180, precio: 320, deposito: 120 },
  { id: 's4', catId: 'cat1', nombre: 'Tratamiento capilar',  descripcion: 'Hidratación profunda',   duracionMin: 60,  precio: 110, deposito: 40 },
  { id: 's5', catId: 'cat2', nombre: 'Manicure',             descripcion: 'Limpieza + esmaltado',   duracionMin: 50,  precio: 45,  deposito: 20 },
  { id: 's6', catId: 'cat2', nombre: 'Pedicure',             descripcion: 'Tratamiento completo',   duracionMin: 60,  precio: 55,  deposito: 20 },
  { id: 's7', catId: 'cat2', nombre: 'Gel completo',         descripcion: 'Hasta 3 semanas',        duracionMin: 90,  precio: 85,  deposito: 30 },
  { id: 's8', catId: 'cat3', nombre: 'Facial rejuvenecedor', descripcion: 'Limpieza + mascarilla',  duracionMin: 75,  precio: 140, deposito: 50 },
];

const ESPECIALISTAS = [
  { id: 'e1', nombre: 'Sofía Martínez', especialidad: 'Colorimetría', iniciales: 'SM', color: 'oklch(0.67 0.158 285)', catIds: ['cat1'] },
  { id: 'e2', nombre: 'Andrea López',   especialidad: 'Nail Art',     iniciales: 'AL', color: 'oklch(0.58 0.155 152)', catIds: ['cat2'] },
  { id: 'e3', nombre: 'Karla Fuentes',  especialidad: 'Tratamientos', iniciales: 'KF', color: 'oklch(0.57 0.21 22)',   catIds: ['cat3', 'cat1'] },
];

const HORARIOS_DISPONIBLES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '14:00', '14:30', '15:00', '16:00', '16:30', '17:00'];

// ─── Wizard steps ─────────────────────────────────────────────────────────────

type Paso = 'servicio' | 'especialista' | 'fecha' | 'confirmar';

const PASOS: Paso[] = ['servicio', 'especialista', 'fecha', 'confirmar'];
const PASO_LABEL: Record<Paso, string> = { servicio: 'Servicio', especialista: 'Especialista', fecha: 'Fecha y hora', confirmar: 'Confirmar' };

function BarraPasos({ actual }: { actual: Paso }) {
  const idx = PASOS.indexOf(actual);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
      {PASOS.map((p, i) => {
        const hecho = i < idx;
        const activo = i === idx;
        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: i < PASOS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hecho ? 'var(--success)' : activo ? 'var(--accent)' : 'var(--border-subtle)', color: hecho || activo ? 'white' : 'var(--ink-muted)', fontSize: 'var(--text-xs)', fontWeight: 700, transition: 'all 200ms ease-out', flexShrink: 0 }}>
                {hecho ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </div>
              <span style={{ fontSize: 'var(--text-2xs)', color: activo ? 'var(--accent)' : 'var(--ink-subtle)', whiteSpace: 'nowrap', fontWeight: activo ? 600 : 400 }}>{PASO_LABEL[p]}</span>
            </div>
            {i < PASOS.length - 1 && (
              <div style={{ height: 2, flex: 1, background: hecho ? 'var(--success)' : 'var(--border-subtle)', borderRadius: 'var(--radius-full)', transition: 'background 300ms ease-out', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Paso 1: Servicio ─────────────────────────────────────────────────────────

function PasoServicio({ onSeleccionar }: { onSeleccionar: (s: typeof SERVICIOS[0]) => void }) {
  const [catActiva, setCatActiva] = useState('cat1');
  const servicios = SERVICIOS.filter((s) => s.catId === catActiva);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', margin: '0 0 var(--space-1)' }}>¿Qué servicio deseas?</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: 0 }}>Selecciona una categoría y luego el servicio.</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {CATEGORIAS.map((c) => (
          <button key={c.id} onClick={() => setCatActiva(c.id)}
            style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-full)', border: '1px solid', borderColor: catActiva === c.id ? 'var(--accent)' : 'var(--border-subtle)', background: catActiva === c.id ? 'var(--accent-subtle)' : 'white', color: catActiva === c.id ? 'var(--accent)' : 'var(--ink-muted)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease-out', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{c.emoji}</span> {c.nombre}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {servicios.map((s) => (
          <motion.button key={s.id} onClick={() => onSeleccionar(s)} whileTap={{ scale: 0.99 }}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms ease-out', width: '100%' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)' }}>{s.nombre}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{s.descripcion}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-muted)' }}>
                <Clock size={11} strokeWidth={1.5} />
                <span style={{ fontSize: 'var(--text-xs)' }}>{s.duracionMin} min</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                <Tag size={11} strokeWidth={1.5} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>S/ {s.precio}</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Paso 2: Especialista ─────────────────────────────────────────────────────

function PasoEspecialista({ catId, onSeleccionar }: { catId: string; onSeleccionar: (e: typeof ESPECIALISTAS[0]) => void }) {
  const disponibles = ESPECIALISTAS.filter((e) => e.catIds.includes(catId));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', margin: '0 0 var(--space-1)' }}>Elige tu especialista</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: 0 }}>{disponibles.length} especialistas disponibles.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {disponibles.map((e) => (
          <motion.button key={e.id} onClick={() => onSeleccionar(e)} whileTap={{ scale: 0.99 }}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms ease-out', width: '100%' }}
            onMouseEnter={(e2) => { (e2.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e2) => { (e2.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: e.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', fontWeight: 700, flexShrink: 0 }}>
              {e.iniciales}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)' }}>{e.nombre}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{e.especialidad}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Paso 3: Fecha y hora ─────────────────────────────────────────────────────

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

function PasoFecha({ onSeleccionar }: { onSeleccionar: (fecha: Date, hora: string) => void }) {
  const hoy = new Date();
  const [año, setAño] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  const dias = generarDias(año, mes);
  const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const navMes = (dir: 1 | -1) => {
    const d = new Date(año, mes + dir, 1);
    setAño(d.getFullYear());
    setMes(d.getMonth());
    setDiaSeleccionado(null);
    setHoraSeleccionada(null);
  };

  const mesNombre = new Date(año, mes, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', margin: '0 0 var(--space-1)' }}>Selecciona fecha y hora</h2>
      </div>

      {/* Calendario compacto */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-subtle)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navMes(-1)}
            style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={13} strokeWidth={1.5} />
          </motion.button>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)', textTransform: 'capitalize' }}>{mesNombre}</span>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navMes(1)}
            style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={13} strokeWidth={1.5} />
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 'var(--space-2)' }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-subtle)', fontWeight: 600, textAlign: 'center', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {dias.map(({ fecha, esMes }, i) => {
            const pasado = fecha < hoy && fecha.toDateString() !== hoy.toDateString();
            const domingo = fecha.getDay() === 0;
            const seleccionado = diaSeleccionado?.toDateString() === fecha.toDateString();
            const esHoyDia = fecha.toDateString() === hoy.toDateString();
            const disponible = esMes && !pasado && !domingo;

            return (
              <button key={i}
                onClick={() => disponible && setDiaSeleccionado(fecha)}
                style={{ height: 34, borderRadius: 'var(--radius-base)', border: 'none', cursor: disponible ? 'pointer' : 'default', background: seleccionado ? 'var(--accent)' : esHoyDia ? 'var(--accent-subtle)' : 'transparent', color: seleccionado ? 'white' : esHoyDia ? 'var(--accent)' : esMes && disponible ? 'var(--ink-strong)' : 'var(--ink-subtle)', fontSize: 'var(--text-xs)', fontWeight: seleccionado || esHoyDia ? 600 : 400, opacity: !esMes || (pasado && !esHoyDia) ? 0.3 : 1, transition: 'all 120ms ease-out' }}>
                {fecha.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horas */}
      {diaSeleccionado && (
        <div>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)', margin: '0 0 var(--space-3)' }}>Horarios disponibles</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {HORARIOS_DISPONIBLES.map((h) => (
              <button key={h} onClick={() => setHoraSeleccionada(h)}
                style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-base)', border: '1px solid', borderColor: horaSeleccionada === h ? 'var(--accent)' : 'var(--border-subtle)', background: horaSeleccionada === h ? 'var(--accent)' : 'white', color: horaSeleccionada === h ? 'white' : 'var(--ink-base)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease-out', fontFamily: 'monospace' }}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {diaSeleccionado && horaSeleccionada && (
        <motion.button
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSeleccionar(diaSeleccionado, horaSeleccionada)}
          style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer' }}>
          Continuar con {diaSeleccionado.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} a las {horaSeleccionada}
        </motion.button>
      )}
    </div>
  );
}

// ─── Paso 4: Confirmar ─────────────────────────────────────────────────────────

function PasoConfirmar({
  servicio, especialista, fecha, hora, onConfirmar,
}: {
  servicio: typeof SERVICIOS[0];
  especialista: typeof ESPECIALISTAS[0];
  fecha: Date;
  hora: string;
  onConfirmar: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', margin: '0 0 var(--space-1)' }}>Confirma tu reserva</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: 0 }}>Revisa los detalles antes de confirmar.</p>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        {[
          { label: 'Servicio',     valor: servicio.nombre },
          { label: 'Especialista', valor: especialista.nombre },
          { label: 'Fecha',        valor: fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'Hora',         valor: hora },
          { label: 'Duración',     valor: `${servicio.duracionMin} minutos` },
          { label: 'Precio total', valor: `S/ ${servicio.precio}` },
          { label: 'Depósito',     valor: `S/ ${servicio.deposito} (requerido)` },
        ].map(({ label, valor }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>{label}</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink-strong)', textTransform: label === 'Fecha' ? 'capitalize' : undefined }}>{valor}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--info-light)', borderRadius: 'var(--radius-xl)' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--info)', lineHeight: 'var(--leading-relaxed)' }}>
          Para confirmar la reserva deberás pagar el depósito de <strong>S/ {servicio.deposito}</strong> vía Yape, Plin o transferencia bancaria. Recibirás un enlace de confirmación por WhatsApp.
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }} onClick={onConfirmar}
        style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-base)', fontWeight: 700, cursor: 'pointer' }}>
        Confirmar reserva
      </motion.button>
    </div>
  );
}

// ─── Paso 5: Éxito ────────────────────────────────────────────────────────────

function PasoExito({ onVolver }: { onVolver: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)', textAlign: 'center', padding: 'var(--space-8) 0' }}
    >
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={28} strokeWidth={2} />
      </div>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', margin: '0 0 var(--space-2)' }}>¡Reserva confirmada!</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: 0 }}>Recibirás la confirmación por WhatsApp en breve.</p>
      </div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onVolver}
        style={{ padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-xl)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
        Ver mis citas
      </motion.button>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClienteReservar() {
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const navigate = useNavigate();

  const [paso, setPaso] = useState<Paso | 'exito'>('servicio');
  const [selServicio, setSelServicio] = useState<typeof SERVICIOS[0] | null>(null);
  const [selEspecialista, setSelEspecialista] = useState<typeof ESPECIALISTAS[0] | null>(null);
  const [selFecha, setSelFecha] = useState<Date | null>(null);
  const [selHora, setSelHora] = useState<string | null>(null);

  const volver = () => {
    const idx = PASOS.indexOf(paso as Paso);
    if (idx > 0) setPaso(PASOS[idx - 1]);
    else navigate('/cliente/citas');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-3) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--accent)', letterSpacing: 'var(--tracking-tight)' }}>Eunoia</div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>Nueva reserva</span>
        </div>
        <button onClick={cerrarSesion}
          style={{ width: 32, height: 32, borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 'var(--space-6)', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        {paso !== 'exito' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={volver}
              style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={14} strokeWidth={1.5} />
            </motion.button>
            <BarraPasos actual={paso as Paso} />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={paso}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -24 }}
            transition={{ duration: 0.22, ease: EASE }}>

            {paso === 'servicio' && (
              <PasoServicio onSeleccionar={(s) => { setSelServicio(s); setPaso('especialista'); }} />
            )}
            {paso === 'especialista' && selServicio && (
              <PasoEspecialista catId={selServicio.catId} onSeleccionar={(e) => { setSelEspecialista(e); setPaso('fecha'); }} />
            )}
            {paso === 'fecha' && (
              <PasoFecha onSeleccionar={(f, h) => { setSelFecha(f); setSelHora(h); setPaso('confirmar'); }} />
            )}
            {paso === 'confirmar' && selServicio && selEspecialista && selFecha && selHora && (
              <PasoConfirmar
                servicio={selServicio} especialista={selEspecialista} fecha={selFecha} hora={selHora}
                onConfirmar={() => setPaso('exito')} />
            )}
            {paso === 'exito' && (
              <PasoExito onVolver={() => navigate('/cliente/citas')} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
