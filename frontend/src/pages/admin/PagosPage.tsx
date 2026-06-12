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

const ESTADO_CFG: Record<IPago['estado'], { label: string; colorCls: string; bgCls: string }> = {
  pendiente:   { label: 'Pendiente',   colorCls: 'text-warning',  bgCls: 'bg-warning-light'  },
  confirmado:  { label: 'Confirmado',  colorCls: 'text-success',  bgCls: 'bg-success-light'  },
  rechazado:   { label: 'Rechazado',   colorCls: 'text-error',    bgCls: 'bg-error-light'    },
  reembolsado: { label: 'Reembolsado', colorCls: 'text-info',     bgCls: 'bg-info-light'     },
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

const STATS_CFG = [
  { key: 'pendiente', label: 'Por confirmar', valorFn: (p: IPagoRow[]) => `S/ ${p.filter(x => x.estado === 'pendiente').reduce((s, x) => s + x.monto, 0)}`, subFn: (p: IPagoRow[]) => `${p.filter(x => x.estado === 'pendiente').length} pagos`, colorCls: 'text-warning', bgCls: 'bg-warning-light', icon: Clock },
  { key: 'confirmado', label: 'Cobrado hoy', valorFn: (p: IPagoRow[]) => `S/ ${p.filter(x => x.estado === 'confirmado' && x.fechaConfirmacion?.startsWith('2026-06-10')).reduce((s, x) => s + x.monto, 0)}`, subFn: (p: IPagoRow[]) => `${p.filter(x => x.estado === 'confirmado' && x.fechaConfirmacion?.startsWith('2026-06-10')).length} confirmados`, colorCls: 'text-success', bgCls: 'bg-success-light', icon: Check },
];

export default function PagosPage() {
  const [filtro, setFiltro] = useState<EstadoFiltro>('todos');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const visibles = PAGOS.filter((p) => filtro === 'todos' || p.estado === filtro);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-strong tracking-tight m-0">
          Pagos
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-0">
          Gestión de cobros y confirmaciones
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {STATS_CFG.map(({ key, label, valorFn, subFn, colorCls, bgCls, icon: Icon }) => (
          <div key={key} className="bg-white rounded-3xl shadow-sm p-5 flex gap-4 items-center">
            <div className={`w-10 h-10 rounded-lg ${bgCls} ${colorCls} flex items-center justify-center shrink-0`}>
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className={`text-xl font-bold text-ink-strong tracking-tight`}>{valorFn(PAGOS)}</div>
              <div className="text-xs text-ink-muted mt-0.5">{label} · {subFn(PAGOS)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['todos', 'pendiente', 'confirmado'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`py-1 px-3 rounded-full border text-xs font-medium cursor-pointer transition-all duration-150 ${
              filtro === f
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-border-subtle bg-white text-ink-muted'
            }`}
          >
            {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'todos' && (
              <span className="ml-1">({PAGOS.filter((p) => p.estado === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div
          className="grid px-5 py-3 border-b border-border-base gap-3 items-center"
          style={{ gridTemplateColumns: '2fr 1.5fr 80px 80px 90px 100px 80px' }}
        >
          {['Cliente', 'Servicio', 'Monto', 'Método', 'Tipo', 'Estado', ''].map((col) => (
            <span key={col} className="text-xs font-semibold text-ink-muted uppercase tracking-[0.04em]">{col}</span>
          ))}
        </div>

        <motion.div variants={variantesLista} initial="oculto" animate="visible">
          {visibles.map((p) => {
            const cfg = ESTADO_CFG[p.estado];
            return (
              <motion.div
                key={p.id}
                variants={reducedMotion ? undefined : variantesFila}
                onMouseEnter={() => setHoverId(p.id)}
                onMouseLeave={() => setHoverId(null)}
                className={`grid px-5 py-3 border-b border-border-subtle gap-3 items-center transition-colors duration-[120ms] ${
                  hoverId === p.id ? 'bg-accent-subtle/40' : 'bg-transparent'
                }`}
                style={{ gridTemplateColumns: '2fr 1.5fr 80px 80px 90px 100px 80px' }}
              >
                <div>
                  <div className="text-sm font-medium text-ink-strong">{p.clienteNombre}</div>
                  {p.referenciaExterna && (
                    <div className="text-2xs text-ink-subtle mt-px">{p.referenciaExterna}</div>
                  )}
                </div>
                <span className="text-sm text-ink-base">{p.servicioNombre}</span>
                <span className="text-sm font-semibold text-ink-strong">S/ {p.monto}</span>
                <span className="text-xs text-ink-muted">{METODO_LABEL[p.metodo]}</span>
                <span className="text-xs text-ink-muted">{TIPO_LABEL[p.tipo]}</span>

                <span className={`py-0.5 px-2 rounded-full text-2xs font-semibold ${cfg.colorCls} ${cfg.bgCls} inline-block`}>
                  {cfg.label}
                </span>

                <div className={`transition-opacity duration-150 ${p.estado === 'pendiente' || hoverId === p.id ? 'opacity-100' : 'opacity-0'}`}>
                  {p.estado === 'pendiente' && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-success text-white border-none text-xs font-semibold cursor-pointer"
                    >
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
          <div className="p-12 text-center">
            <p className="text-sm text-ink-muted">No hay pagos con ese filtro.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
