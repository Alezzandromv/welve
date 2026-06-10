import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import type { IPago } from '@/types';

type EstadoFiltro = 'todos' | 'pendiente' | 'confirmado';

interface IPagoRow extends IPago {
  clienteNombre: string;
  servicioNombre: string;
}

const METODO_LABEL: Record<IPago['metodo'], string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta',
};
const TIPO_LABEL: Record<IPago['tipo'], string> = {
  deposito: 'Depósito', saldo: 'Saldo', total: 'Total', penalizacion: 'Penalización', reembolso: 'Reembolso',
};

const ESTADO_CFG: Record<IPago['estado'], { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente',   color: 'var(--warning)',  bg: 'var(--warning-light)'  },
  confirmado:  { label: 'Confirmado',  color: 'var(--success)',  bg: 'var(--success-light)'  },
  rechazado:   { label: 'Rechazado',   color: 'var(--error)',    bg: 'var(--error-light)'    },
  reembolsado: { label: 'Reembolsado', color: 'var(--info)',     bg: 'var(--info-light)'     },
};

const PAGOS: IPagoRow[] = [
  { id: 'p1',  citaId: 'c1', clienteId: 'u1', clienteNombre: 'Valentina Torres', servicioNombre: 'Corte y color',       tipo: 'deposito',    metodo: 'yape',         estado: 'pendiente',  monto: 60,  referenciaExterna: null, confirmadoPor: null, fechaConfirmacion: null },
  { id: 'p2',  citaId: 'c2', clienteId: 'u2', clienteNombre: 'Camila Ríos',      servicioNombre: 'Manicure',            tipo: 'total',       metodo: 'efectivo',     estado: 'confirmado', monto: 45,  referenciaExterna: null, confirmadoPor: 'Admin', fechaConfirmacion: '2026-06-10T11:30' },
  { id: 'p3',  citaId: 'c3', clienteId: 'u3', clienteNombre: 'Daniela Cruz',     servicioNombre: 'Tratamiento capilar', tipo: 'deposito',    metodo: 'transferencia',estado: 'pendiente',  monto: 40,  referenciaExterna: 'BCP-882314', confirmadoPor: null, fechaConfirmacion: null },
  { id: 'p4',  citaId: 'c4', clienteId: 'u4', clienteNombre: 'Rosa Medina',      servicioNombre: 'Alisado keratina',    tipo: 'saldo',       metodo: 'yape',         estado: 'pendiente',  monto: 200, referenciaExterna: null, confirmadoPor: null, fechaConfirmacion: null },
  { id: 'p5',  citaId: 'c5', clienteId: 'u5', clienteNombre: 'Patricia Díaz',    servicioNombre: 'Gel completo',        tipo: 'total',       metodo: 'tarjeta',      estado: 'confirmado', monto: 85,  referenciaExterna: null, confirmadoPor: 'Admin', fechaConfirmacion: '2026-06-10T09:15' },
  { id: 'p6',  citaId: 'c6', clienteId: 'u6', clienteNombre: 'Lucía Paredes',    servicioNombre: 'Pedicure',            tipo: 'deposito',    metodo: 'plin',         estado: 'pendiente',  monto: 20,  referenciaExterna: null, confirmadoPor: null, fechaConfirmacion: null },
  { id: 'p7',  citaId: 'c7', clienteId: 'u7', clienteNombre: 'Isabel Flores',    servicioNombre: 'Corte clásico',       tipo: 'penalizacion',metodo: 'efectivo',     estado: 'confirmado', monto: 30,  referenciaExterna: null, confirmadoPor: 'Admin', fechaConfirmacion: '2026-06-09T17:00' },
  { id: 'p8',  citaId: 'c8', clienteId: 'u8', clienteNombre: 'Elena Mora',       servicioNombre: 'Manicure + pedicure', tipo: 'reembolso',   metodo: 'transferencia',estado: 'reembolsado',monto: 55,  referenciaExterna: null, confirmadoPor: 'Admin', fechaConfirmacion: '2026-06-08T14:20' },
  { id: 'p9',  citaId: 'c9', clienteId: 'u9', clienteNombre: 'Mariana Vega',     servicioNombre: 'Facial rejuvenecedor',tipo: 'deposito',    metodo: 'yape',         estado: 'pendiente',  monto: 50,  referenciaExterna: 'YAPE-129847', confirmadoPor: null, fechaConfirmacion: null },
  { id: 'p10', citaId:'c10', clienteId:'u10', clienteNombre: 'Carmen Santos',    servicioNombre: 'Color completo',      tipo: 'saldo',       metodo: 'efectivo',     estado: 'confirmado', monto: 120, referenciaExterna: null, confirmadoPor: 'Admin', fechaConfirmacion: '2026-06-10T10:45' },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const variantesLista = { visible: { transition: { staggerChildren: 0.04 } } };
const variantesFila  = { oculto: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } };

export default function PagosPage() {
  const [filtro, setFiltro] = useState<EstadoFiltro>('todos');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const visibles = PAGOS.filter((p) => filtro === 'todos' || p.estado === filtro);

  const totalPendiente = PAGOS.filter((p) => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);
  const confirmadosHoy = PAGOS.filter((p) => p.estado === 'confirmado' && p.fechaConfirmacion?.startsWith('2026-06-10')).reduce((s, p) => s + p.monto, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
          Pagos
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
          Gestión de cobros y confirmaciones
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          { label: 'Por confirmar', valor: `S/ ${totalPendiente}`, sub: `${PAGOS.filter((p) => p.estado === 'pendiente').length} pagos`, color: 'var(--warning)', bg: 'var(--warning-light)', icon: Clock },
          { label: 'Cobrado hoy',   valor: `S/ ${confirmadosHoy}`,  sub: `${PAGOS.filter((p) => p.estado === 'confirmado' && p.fechaConfirmacion?.startsWith('2026-06-10')).length} confirmados`, color: 'var(--success)', bg: 'var(--success-light)', icon: Check },
        ].map(({ label, valor, sub, color, bg, icon: Icon }) => (
          <div key={label} style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-base)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)' }}>{valor}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{label} · {sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {(['todos', 'pendiente', 'confirmado'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: '1px solid', borderColor: filtro === f ? 'var(--accent)' : 'var(--border-subtle)', background: filtro === f ? 'var(--accent-subtle)' : 'white', color: filtro === f ? 'var(--accent)' : 'var(--ink-muted)', fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease-out' }}>
            {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'todos' && (
              <span style={{ marginLeft: 4 }}>({PAGOS.filter((p) => p.estado === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 80px 80px 90px 100px 80px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-base)', gap: 'var(--space-3)', alignItems: 'center' }}>
          {['Cliente', 'Servicio', 'Monto', 'Método', 'Tipo', 'Estado', ''].map((col) => (
            <span key={col} style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
          ))}
        </div>

        <motion.div variants={variantesLista} initial="oculto" animate="visible">
          {visibles.map((p) => {
            const cfg = ESTADO_CFG[p.estado];
            return (
              <motion.div key={p.id} variants={reducedMotion ? undefined : variantesFila}
                onMouseEnter={() => setHoverId(p.id)} onMouseLeave={() => setHoverId(null)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 80px 80px 90px 100px 80px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', gap: 'var(--space-3)', alignItems: 'center', background: hoverId === p.id ? 'oklch(0.93 0.028 284 / 0.4)' : 'transparent', transition: 'background 120ms ease-out' }}>

                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink-strong)' }}>{p.clienteNombre}</div>
                  {p.referenciaExterna && (
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-subtle)', marginTop: 1 }}>{p.referenciaExterna}</div>
                  )}
                </div>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)' }}>{p.servicioNombre}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-strong)' }}>S/ {p.monto}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{METODO_LABEL[p.metodo]}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{TIPO_LABEL[p.tipo]}</span>

                <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: cfg.color, background: cfg.bg, display: 'inline-block' }}>
                  {cfg.label}
                </span>

                <div style={{ opacity: p.estado === 'pendiente' || hoverId === p.id ? 1 : 0, transition: 'opacity 150ms' }}>
                  {p.estado === 'pendiente' && (
                    <motion.button whileTap={{ scale: 0.97 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-base)', background: 'var(--success)', color: 'white', border: 'none', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer' }}>
                      <Check size={11} strokeWidth={2} />
                      Confirmar
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {visibles.length === 0 && (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>No hay pagos con ese filtro.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
