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
  descuento:      { colorCls: 'text-accent',   bgCls: 'bg-accent-subtle',  icon: Gift  },
  servicio_gratis:{ colorCls: 'text-success',  bgCls: 'bg-success-light',  icon: Star  },
  credito:        { colorCls: 'text-warning',  bgCls: 'bg-warning-light',  icon: Award },
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
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-strong tracking-tight m-0">
          Fidelización
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-0">
          Retos de visitas y descuentos activos
        </p>
      </div>

      {/* Retos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-strong m-0">Retos activos</h2>
          <span className="text-xs text-ink-muted">{RETOS.length} retos</span>
        </div>

        <motion.div
          variants={variantesGrid}
          initial="oculto"
          animate="visible"
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {RETOS.map((r) => {
            const cfg = RECOMPENSA_CFG[r.recompensaTipo];
            const Icon = cfg.icon;
            const pctCurso = Math.round((r.clientesEnCurso / (r.clientesEnCurso + r.clientesCompletaron + 1)) * 100);
            return (
              <motion.div
                key={r.id}
                variants={reducedMotion ? undefined : variantesTarjeta}
                className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-[38px] h-[38px] rounded-lg ${cfg.bgCls} ${cfg.colorCls} flex items-center justify-center shrink-0`}>
                    <Icon size={17} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-ink-strong">{r.nombre}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{r.descripcion}</div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className={`text-2xs ${cfg.colorCls} ${cfg.bgCls} py-0.5 px-2 rounded-full font-semibold`}>
                    {r.recompensaValor}
                  </span>
                  <span className="text-2xs text-ink-muted py-0.5 px-2 rounded-full border border-border-subtle">
                    {r.visitasRequeridas} visitas · {r.diasVentana} días
                  </span>
                </div>

                <div className="border-t border-border-subtle pt-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-ink-muted">Clientas en curso</span>
                    <span className="text-xs font-semibold text-ink-strong">{r.clientesEnCurso}</span>
                  </div>
                  <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctCurso}%` }}
                      className={`h-full rounded-full transition-[width] duration-[600ms] ease-out ${cfg.colorCls.replace('text-', 'bg-')}`}
                    />
                  </div>
                  <div className="text-2xs text-ink-subtle mt-1">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-strong m-0">Descuentos</h2>
          <span className="text-xs text-ink-muted">{DESCUENTOS.filter((d) => d.activo).length} activos</span>
        </div>

        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div
            className="grid px-5 py-3 border-b border-border-base gap-3"
            style={{ gridTemplateColumns: '120px 1fr 90px 100px 130px 80px' }}
          >
            {['Código', 'Valor', 'Tipo', 'Usos', 'Vigencia', 'Estado'].map((col) => (
              <span key={col} className="text-xs font-semibold text-ink-muted uppercase tracking-[0.04em]">{col}</span>
            ))}
          </div>

          {DESCUENTOS.map((d) => (
            <div
              key={d.id}
              className={`grid px-5 py-3 border-b border-border-subtle gap-3 items-center${d.activo ? '' : ' opacity-50'}`}
              style={{ gridTemplateColumns: '120px 1fr 90px 100px 130px 80px' }}
            >
              <div className="text-sm font-semibold text-ink-strong font-mono">
                {d.codigo ?? <span className="font-sans font-normal text-ink-subtle">Sin código</span>}
              </div>
              <div className="text-sm font-semibold text-accent">
                {d.tipo === 'porcentaje' ? `${d.valor}% off` : `S/ ${d.valor} off`}
              </div>
              <span className="text-xs text-ink-muted capitalize">{d.scope}</span>
              <span className="text-xs text-ink-base">
                {d.usosActuales}{d.maxUsosGlobal !== null ? ` / ${d.maxUsosGlobal}` : ''}
                {d.maxUsosGlobal !== null && (
                  <div className="h-[3px] bg-border-subtle rounded-full mt-[3px] overflow-hidden">
                    <div
                      style={{ width: `${Math.round((d.usosActuales / d.maxUsosGlobal) * 100)}%` }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                )}
              </span>
              <span className="text-xs text-ink-muted">
                {formatFecha(d.vigentaDesde)} – {formatFecha(d.vigentaHasta)}
              </span>
              <span className={`py-0.5 px-2 rounded-full text-2xs font-semibold ${d.activo ? 'text-success bg-success-light' : 'text-ink-muted bg-border-subtle'}`}>
                {d.activo ? 'Activo' : 'Expirado'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
