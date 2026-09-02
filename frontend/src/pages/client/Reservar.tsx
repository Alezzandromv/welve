import { useState } from 'react';
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
    <div className="flex items-center gap-2 mb-6">
      {PASOS.map((p, i) => {
        const hecho = i < idx;
        const activo = i === idx;
        return (
          <div key={p} className={`flex items-center gap-2${i < PASOS.length - 1 ? ' flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shrink-0 ${
                hecho ? 'bg-success text-white' : activo ? 'bg-accent text-white' : 'bg-border-subtle text-ink-muted'
              }`}>
                {hecho ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </div>
              <span className={`text-2xs whitespace-nowrap ${activo ? 'text-accent font-semibold' : 'text-ink-subtle font-normal'}`}>
                {PASO_LABEL[p]}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded-full mb-[18px] transition-colors duration-300 ${hecho ? 'bg-success' : 'bg-border-subtle'}`}
              />
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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink-strong m-0 mb-1">¿Qué servicio deseas?</h2>
        <p className="text-sm text-ink-muted m-0">Selecciona una categoría y luego el servicio.</p>
      </div>

      <div className="flex gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatActiva(c.id)}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-full border text-sm font-medium cursor-pointer transition-all duration-150 ${
              catActiva === c.id
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-border-subtle bg-white text-ink-muted'
            }`}
          >
            <span>{c.emoji}</span> {c.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {servicios.map((s) => (
          <motion.button
            key={s.id}
            onClick={() => onSeleccionar(s)}
            whileTap={{ scale: 0.99 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border-subtle bg-white cursor-pointer text-left transition-[border-color] duration-150 w-full hover:border-accent"
          >
            <div className="flex-1">
              <div className="text-base font-semibold text-ink-strong">{s.nombre}</div>
              <div className="text-xs text-ink-muted mt-0.5">{s.descripcion}</div>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              <div className="flex items-center gap-1 text-ink-muted">
                <Clock size={11} strokeWidth={1.5} />
                <span className="text-xs">{s.duracionMin} min</span>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <Tag size={11} strokeWidth={1.5} />
                <span className="text-sm font-semibold">S/ {s.precio}</span>
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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink-strong m-0 mb-1">Elige tu especialista</h2>
        <p className="text-sm text-ink-muted m-0">{disponibles.length} especialistas disponibles.</p>
      </div>
      <div className="flex flex-col gap-3">
        {disponibles.map((e) => (
          <motion.button
            key={e.id}
            onClick={() => onSeleccionar(e)}
            whileTap={{ scale: 0.99 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border-subtle bg-white cursor-pointer text-left transition-[border-color] duration-150 w-full hover:border-accent"
          >
            <div
              style={{ background: e.color }}
              className="w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0"
            >
              {e.iniciales}
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold text-ink-strong">{e.nombre}</div>
              <div className="text-xs text-ink-muted mt-0.5">{e.especialidad}</div>
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
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-ink-strong m-0 mb-1">Selecciona fecha y hora</h2>
      </div>

      {/* Calendario compacto */}
      <div className="bg-white rounded-3xl border border-border-subtle p-4">
        <div className="flex items-center justify-between mb-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navMes(-1)}
            className="w-7 h-7 rounded-full border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
          </motion.button>
          <span className="text-sm font-semibold text-ink-strong capitalize">{mesNombre}</span>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navMes(1)}
            className="w-7 h-7 rounded-full border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={13} strokeWidth={1.5} />
          </motion.button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-2xs text-ink-subtle font-semibold text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {dias.map(({ fecha, esMes }, i) => {
            const pasado = fecha < hoy && fecha.toDateString() !== hoy.toDateString();
            const domingo = fecha.getDay() === 0;
            const seleccionado = diaSeleccionado?.toDateString() === fecha.toDateString();
            const esHoyDia = fecha.toDateString() === hoy.toDateString();
            const disponible = esMes && !pasado && !domingo;

            return (
              <button
                key={i}
                onClick={() => disponible && setDiaSeleccionado(fecha)}
                className={`h-[34px] rounded-lg border-none text-xs transition-all duration-[120ms] ${
                  seleccionado
                    ? 'bg-accent text-white font-semibold cursor-pointer'
                    : esHoyDia
                      ? 'bg-accent-subtle text-accent font-semibold cursor-pointer'
                      : esMes && disponible
                        ? 'bg-transparent text-ink-strong font-normal cursor-pointer hover:bg-accent-subtle/50'
                        : 'bg-transparent text-ink-subtle font-normal cursor-default'
                } ${!esMes || (pasado && !esHoyDia) ? 'opacity-30' : ''}`}
              >
                {fecha.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horas */}
      {diaSeleccionado && (
        <div>
          <h3 className="text-sm font-semibold text-ink-strong m-0 mb-3">Horarios disponibles</h3>
          <div className="flex flex-wrap gap-2">
            {HORARIOS_DISPONIBLES.map((h) => (
              <button
                key={h}
                onClick={() => setHoraSeleccionada(h)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-150 font-mono ${
                  horaSeleccionada === h
                    ? 'border-accent bg-accent text-white'
                    : 'border-border-subtle bg-white text-ink-base'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {diaSeleccionado && horaSeleccionada && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSeleccionar(diaSeleccionado, horaSeleccionada)}
          className="p-3 rounded-2xl bg-accent text-accent-foreground border-none text-base font-semibold cursor-pointer"
        >
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
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-ink-strong m-0 mb-1">Confirma tu reserva</h2>
        <p className="text-sm text-ink-muted m-0">Revisa los detalles antes de confirmar.</p>
      </div>

      <div className="bg-white rounded-3xl border border-border-subtle overflow-hidden">
        {[
          { label: 'Servicio',     valor: servicio.nombre },
          { label: 'Especialista', valor: especialista.nombre },
          { label: 'Fecha',        valor: fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'Hora',         valor: hora },
          { label: 'Duración',     valor: `${servicio.duracionMin} minutos` },
          { label: 'Precio total', valor: `S/ ${servicio.precio}` },
          { label: 'Depósito',     valor: `S/ ${servicio.deposito} (requerido)` },
        ].map(({ label, valor }) => (
          <div key={label} className="flex justify-between py-3 px-5 border-b border-border-subtle">
            <span className="text-sm text-ink-muted">{label}</span>
            <span className={`text-sm font-medium text-ink-strong${label === 'Fecha' ? ' capitalize' : ''}`}>{valor}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 bg-info-light rounded-2xl">
        <span className="text-xs text-info leading-relaxed">
          Para confirmar la reserva deberás pagar el depósito de <strong>S/ {servicio.deposito}</strong> vía Yape, Plin o transferencia bancaria. Recibirás un enlace de confirmación por WhatsApp.
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onConfirmar}
        className="p-4 rounded-2xl bg-accent text-accent-foreground border-none text-base font-bold cursor-pointer"
      >
        Confirmar reserva
      </motion.button>
    </div>
  );
}

// ─── Paso 5: Éxito ────────────────────────────────────────────────────────────

function PasoExito({ onVolver }: { onVolver: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex flex-col items-center gap-5 text-center py-8"
    >
      <div className="w-16 h-16 rounded-full bg-success-light text-success flex items-center justify-center">
        <Check size={28} strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink-strong m-0 mb-2">¡Reserva confirmada!</h2>
        <p className="text-sm text-ink-muted m-0">Recibirás la confirmación por WhatsApp en breve.</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onVolver}
        className="py-3 px-6 rounded-2xl bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer"
      >
        Ver mis citas
      </motion.button>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClienteReservar() {
  // Leer refs durante el render está prohibido (react-hooks/refs) — un estado con
  // inicializador perezoso da el mismo "calculado una sola vez" sin ese problema.
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    <div className="min-h-screen bg-surface-bg flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-border-subtle px-6 py-3 flex items-center gap-4">
        <div className="text-lg font-bold text-accent tracking-tight">Eunoia</div>
        <div className="flex-1">
          <span className="text-sm text-ink-muted">Nueva reserva</span>
        </div>
        <button
          onClick={cerrarSesion}
          className="w-8 h-8 rounded-lg border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer"
        >
          <LogOut size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-[560px] mx-auto w-full">
        {paso !== 'exito' && (
          <div className="flex items-center gap-3 mb-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={volver}
              className="w-8 h-8 rounded-full border border-border-subtle bg-white text-ink-muted flex items-center justify-center cursor-pointer shrink-0"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
            </motion.button>
            <BarraPasos actual={paso as Paso} />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -24 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
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
                servicio={selServicio}
                especialista={selEspecialista}
                fecha={selFecha}
                hora={selHora}
                onConfirmar={() => setPaso('exito')}
              />
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
