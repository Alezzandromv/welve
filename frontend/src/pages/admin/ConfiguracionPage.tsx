import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Link, MapPin, Phone, Shield, Users } from 'lucide-react';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface IPersonalRow {
  id: string;
  nombre: string;
  iniciales: string;
  especialidad: string;
  color: string;
  tipo: string;
  activo: boolean;
}

const PERSONAL: IPersonalRow[] = [
  { id: 'p1', nombre: 'Sofía Martínez',  iniciales: 'SM', especialidad: 'Colorimetría',  color: 'oklch(0.67 0.158 285)', tipo: 'Full-time',  activo: true  },
  { id: 'p2', nombre: 'Andrea López',    iniciales: 'AL', especialidad: 'Nail Art',       color: 'oklch(0.58 0.155 152)', tipo: 'Full-time',  activo: true  },
  { id: 'p3', nombre: 'Karla Fuentes',   iniciales: 'KF', especialidad: 'Tratamientos',   color: 'oklch(0.57 0.21 22)',   tipo: 'Part-time',  activo: true  },
  { id: 'p4', nombre: 'Melissa Torres',  iniciales: 'MT', especialidad: 'Cortes',         color: 'oklch(0.76 0.17 72)',   tipo: 'Por cita',   activo: false },
];

const HORARIO = [
  { dia: 'Lunes',     apertura: '09:00', cierre: '18:00', activo: true  },
  { dia: 'Martes',    apertura: '09:00', cierre: '18:00', activo: true  },
  { dia: 'Miércoles', apertura: '09:00', cierre: '18:00', activo: true  },
  { dia: 'Jueves',    apertura: '09:00', cierre: '19:00', activo: true  },
  { dia: 'Viernes',   apertura: '09:00', cierre: '19:00', activo: true  },
  { dia: 'Sábado',    apertura: '10:00', cierre: '17:00', activo: true  },
  { dia: 'Domingo',   apertura: '—',     cierre: '—',     activo: false },
];

function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
        <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
          <Icono size={15} strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-semibold text-ink-strong m-0">{titulo}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-[0.04em]">{label}</label>
      <div className="text-sm text-ink-strong py-2 px-3 bg-surface-bg rounded-lg border border-border-subtle">
        {valor}
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  // Leer refs durante el render está prohibido (react-hooks/refs) — un estado con
  // inicializador perezoso da el mismo "calculado una sola vez" sin ese problema.
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-ink-strong tracking-tight m-0">
          Configuración
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-0">
          Información del salón y parámetros del sistema
        </p>
      </div>

      {/* Información del salón */}
      <Seccion titulo="Información del salón" icono={MapPin}>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          <Campo label="Nombre" valor="Eunoia Beauty Salon" />
          <Campo label="RUC" valor="20612345678" />
          <Campo label="Teléfono" valor="+51 1 234 5678" />
          <Campo label="WhatsApp Business" valor="+51 987 654 321" />
          <Campo label="Dirección" valor="Av. Larco 1234, Miraflores" />
          <Campo label="Ciudad" valor="Lima, Perú" />
          <Campo label="Correo" valor="citas@eunoiabeauty.pe" />
          <Campo label="Instagram" valor="@eunoiabeautysalon" />
        </div>
      </Seccion>

      {/* Horario */}
      <Seccion titulo="Horario de atención" icono={Clock}>
        <div className="flex flex-col gap-2">
          {HORARIO.map(({ dia, apertura, cierre, activo }) => (
            <div
              key={dia}
              className={`flex items-center gap-4 py-2 px-3 rounded-lg bg-surface-bg${activo ? '' : ' opacity-50'}`}
            >
              <div className="w-[88px] text-sm font-medium text-ink-strong shrink-0">{dia}</div>
              <div className="flex items-center gap-2 flex-1">
                {activo ? (
                  <>
                    <span className="text-sm text-ink-base font-mono">{apertura}</span>
                    <span className="text-xs text-ink-subtle">–</span>
                    <span className="text-sm text-ink-base font-mono">{cierre}</span>
                  </>
                ) : (
                  <span className="text-sm text-ink-subtle">Cerrado</span>
                )}
              </div>
              <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${activo ? 'text-success bg-success-light' : 'text-ink-muted bg-border-subtle'}`}>
                {activo ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Personal */}
      <Seccion titulo="Personal" icono={Users}>
        <div className="flex flex-col gap-3">
          {PERSONAL.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-lg border border-border-subtle${p.activo ? '' : ' opacity-55'}`}
            >
              <div
                style={{ background: p.color }}
                className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
              >
                {p.iniciales}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink-strong">{p.nombre}</div>
                <div className="text-xs text-ink-muted mt-px">{p.especialidad} · {p.tipo}</div>
              </div>
              <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${p.activo ? 'text-success bg-success-light' : 'text-ink-muted bg-border-subtle'}`}>
                {p.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Auth */}
      <Seccion titulo="Autenticación" icono={Shield}>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          <Campo label="Método" valor="Magic Link vía WhatsApp" />
          <Campo label="TTL del enlace" valor="60 minutos (uso único)" />
          <Campo label="JWT Access Token" valor="60 minutos" />
          <Campo label="Algoritmo" valor="HS256" />
        </div>
        <div className="mt-4 flex items-center gap-2 p-3 bg-info-light rounded-lg">
          <Link size={14} strokeWidth={1.5} className="text-info shrink-0" />
          <span className="text-xs text-info">
            Los magic links se invalidan automáticamente después del primer uso. No se almacenan contraseñas.
          </span>
        </div>
      </Seccion>

      {/* WhatsApp Business */}
      <Seccion titulo="WhatsApp Business" icono={Phone}>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          <Campo label="Número registrado" valor="+51 987 654 321" />
          <Campo label="Proveedor" valor="Meta Cloud API" />
          <Campo label="Recordatorio 24h" valor="Habilitado" />
          <Campo label="Recordatorio 2h" valor="Habilitado" />
          <Campo label="Notificación en alta" valor="Solo si acepta_whatsapp = true" />
        </div>
      </Seccion>
    </motion.div>
  );
}
