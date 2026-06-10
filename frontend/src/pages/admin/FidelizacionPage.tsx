import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Award, Gift, Star } from 'lucide-react';

interface IReto {
  id: string;
  nombre: string;
  descripcion: string;
  visitasRequeridas: number;
  diasVentana: number;
  recompensaTipo: 'descuento' | 'servicio_gratis' | 'credito';
  recompensaValor: string;
  clientesCompletaron: number;
  clientesEnCurso: number;
}

interface IDescuentoActivo {
  id: string;
  codigo: string | null;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  scope: 'publico' | 'privado' | 'reto';
  usosActuales: number;
  maxUsosGlobal: number | null;
  vigentaDesde: string;
  vigentaHasta: string;
  activo: boolean;
}

const RETOS: IReto[] = [
  {
    id: 'r1', nombre: 'Clienta Habitual',
    descripcion: '5 visitas en 90 días → 15% en tu próxima cita',
    visitasRequeridas: 5, diasVentana: 90,
    recompensaTipo: 'descuento', recompensaValor: '15% en próxima cita',
    clientesCompletaron: 12, clientesEnCurso: 8,
  },
  {
    id: 'r2', nombre: 'VIP Beauty',
    descripcion: '10 visitas en 180 días → Manicure gratis',
    visitasRequeridas: 10, diasVentana: 180,
    recompensaTipo: 'servicio_gratis', recompensaValor: 'Manicure gratis',
    clientesCompletaron: 4, clientesEnCurso: 15,
  },
  {
    id: 'r3', nombre: 'Primera vez',
    descripcion: '3 visitas en 60 días → S/ 30 de crédito',
    visitasRequeridas: 3, diasVentana: 60,
    recompensaTipo: 'credito', recompensaValor: 'S/ 30 en saldo',
    clientesCompletaron: 27, clientesEnCurso: 11,
  },
];

const DESCUENTOS: IDescuentoActivo[] = [
  { id: 'd1', codigo: 'VERANO25',  tipo: 'porcentaje', valor: 25, scope: 'publico',  usosActuales: 14, maxUsosGlobal: 50,  vigentaDesde: '2026-06-01', vigentaHasta: '2026-06-30', activo: true  },
  { id: 'd2', codigo: 'VIP15',     tipo: 'porcentaje', valor: 15, scope: 'privado',  usosActuales: 3,  maxUsosGlobal: 10,  vigentaDesde: '2026-06-01', vigentaHasta: '2026-07-31', activo: true  },
  { id: 'd3', codigo: null,        tipo: 'monto_fijo', valor: 20, scope: 'publico',  usosActuales: 89, maxUsosGlobal: 100, vigentaDesde: '2026-05-15', vigentaHasta: '2026-06-15', activo: true  },
  { id: 'd4', codigo: 'MAMA2026',  tipo: 'porcentaje', valor: 20, scope: 'privado',  usosActuales: 41, maxUsosGlobal: 41,  vigentaDesde: '2026-05-01', vigentaHasta: '2026-06-01', activo: false },
  { id: 'd5', codigo: 'RETO-r1ab', tipo: 'porcentaje', valor: 15, scope: 'reto',     usosActuales: 0,  maxUsosGlobal: 1,   vigentaDesde: '2026-06-08', vigentaHasta: '2026-09-06', activo: true  },
];

const RECOMPENSA_CFG = {
  descuento:      { color: 'var(--accent)',  bg: 'var(--accent-subtle)', icon: Gift  },
  servicio_gratis:{ color: 'var(--success)', bg: 'var(--success-light)', icon: Star  },
  credito:        { color: 'var(--warning)', bg: 'var(--warning-light)', icon: Award },
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const variantesGrid = { visible: { transition: { staggerChildren: 0.06 } } };
const variantesTarjeta = { oculto: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } };

function formatFecha(s: string) {
  return new Date(s + 'T00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FidelizacionPage() {
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
          Fidelización
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
          Retos de visitas y descuentos activos
        </p>
      </div>

      {/* Retos */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>Retos activos</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{RETOS.length} retos</span>
        </div>

        <motion.div variants={variantesGrid} initial="oculto" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {RETOS.map((r) => {
            const cfg = RECOMPENSA_CFG[r.recompensaTipo];
            const Icon = cfg.icon;
            const pctCurso = Math.round((r.clientesEnCurso / (r.clientesEnCurso + r.clientesCompletaron + 1)) * 100);
            return (
              <motion.div key={r.id} variants={reducedMotion ? undefined : variantesTarjeta}
                style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-base)', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)' }}>{r.nombre}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{r.descripcion}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--text-2xs)', color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                    {r.recompensaValor}
                  </span>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-muted)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
                    {r.visitasRequeridas} visitas · {r.diasVentana} días
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>Clientas en curso</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-strong)' }}>{r.clientesEnCurso}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${pctCurso}%`, height: '100%', background: cfg.color, borderRadius: 'var(--radius-full)', transition: 'width 600ms ease-out' }} />
                  </div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-subtle)', marginTop: 4 }}>
                    {r.clientesCompletaron} completaron este reto
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Descuentos */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>Descuentos</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{DESCUENTOS.filter((d) => d.activo).length} activos</span>
        </div>

        <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 100px 130px 80px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-base)', gap: 'var(--space-3)' }}>
            {['Código', 'Valor', 'Tipo', 'Usos', 'Vigencia', 'Estado'].map((col) => (
              <span key={col} style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
            ))}
          </div>

          {DESCUENTOS.map((d) => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 100px 130px 80px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', gap: 'var(--space-3)', alignItems: 'center', opacity: d.activo ? 1 : 0.5 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)', fontFamily: 'monospace' }}>
                {d.codigo ?? <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--ink-subtle)' }}>Sin código</span>}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--accent)' }}>
                {d.tipo === 'porcentaje' ? `${d.valor}% off` : `S/ ${d.valor} off`}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', textTransform: 'capitalize' }}>{d.scope}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-base)' }}>
                {d.usosActuales}{d.maxUsosGlobal !== null ? ` / ${d.maxUsosGlobal}` : ''}
                {d.maxUsosGlobal !== null && (
                  <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 'var(--radius-full)', marginTop: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((d.usosActuales / d.maxUsosGlobal) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                )}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                {formatFecha(d.vigentaDesde)} – {formatFecha(d.vigentaHasta)}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: d.activo ? 'var(--success)' : 'var(--ink-muted)', background: d.activo ? 'var(--success-light)' : 'var(--border-subtle)' }}>
                {d.activo ? 'Activo' : 'Expirado'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
