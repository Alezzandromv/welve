import { useRef } from 'react';
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
    <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-base)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icono size={15} strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>{titulo}</h2>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>{children}</div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-strong)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-bg)', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)' }}>
        {valor}
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
          Configuración
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
          Información del salón y parámetros del sistema
        </p>
      </div>

      {/* Información del salón */}
      <Seccion titulo="Información del salón" icono={MapPin}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {HORARIO.map(({ dia, apertura, cierre, activo }) => (
            <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-base)', background: 'var(--surface-bg)', opacity: activo ? 1 : 0.5 }}>
              <div style={{ width: 88, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink-strong)', flexShrink: 0 }}>{dia}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
                {activo ? (
                  <>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)', fontFamily: 'monospace' }}>{apertura}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-subtle)' }}>–</span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)', fontFamily: 'monospace' }}>{cierre}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-subtle)' }}>Cerrado</span>
                )}
              </div>
              <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', color: activo ? 'var(--success)' : 'var(--ink-muted)', background: activo ? 'var(--success-light)' : 'var(--border-subtle)' }}>
                {activo ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Personal */}
      <Seccion titulo="Personal" icono={Users}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {PERSONAL.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', opacity: p.activo ? 1 : 0.55 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: p.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>
                {p.iniciales}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)' }}>{p.nombre}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>{p.especialidad} · {p.tipo}</div>
              </div>
              <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', color: p.activo ? 'var(--success)' : 'var(--ink-muted)', background: p.activo ? 'var(--success-light)' : 'var(--border-subtle)' }}>
                {p.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Auth */}
      <Seccion titulo="Autenticación" icono={Shield}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          <Campo label="Método" valor="Magic Link vía WhatsApp" />
          <Campo label="TTL del enlace" valor="60 minutos (uso único)" />
          <Campo label="JWT Access Token" valor="60 minutos" />
          <Campo label="Algoritmo" valor="HS256" />
        </div>
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--info-light)', borderRadius: 'var(--radius-base)' }}>
          <Link size={14} strokeWidth={1.5} style={{ color: 'var(--info)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--info)' }}>
            Los magic links se invalidan automáticamente después del primer uso. No se almacenan contraseñas.
          </span>
        </div>
      </Seccion>

      {/* Contacto WhatsApp */}
      <Seccion titulo="WhatsApp Business" icono={Phone}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
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
