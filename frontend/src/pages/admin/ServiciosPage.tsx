import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Tag } from 'lucide-react';

interface IServicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  deposito: number;
  requiereFicha: boolean;
  activo: boolean;
}

interface ICategoria {
  id: string;
  nombre: string;
  color: string;
  servicios: IServicio[];
}

const CATEGORIAS: ICategoria[] = [
  {
    id: 'cat1',
    nombre: 'Cabello',
    color: 'var(--accent)',
    servicios: [
      { id: 's1', nombre: 'Corte clásico',       descripcion: 'Corte en seco o húmedo según técnica',       duracionMin: 45,  precio: 70,  deposito: 30,  requiereFicha: false, activo: true  },
      { id: 's2', nombre: 'Color completo',       descripcion: 'Tinte en raíz y extensión completa',         duracionMin: 120, precio: 180, deposito: 60,  requiereFicha: true,  activo: true  },
      { id: 's3', nombre: 'Alisado keratin.',     descripcion: 'Keratina brasileña, duración 4–6 meses',     duracionMin: 180, precio: 320, deposito: 120, requiereFicha: true,  activo: true  },
      { id: 's4', nombre: 'Tratamiento capilar',  descripcion: 'Hidratación profunda con ampollas',           duracionMin: 60,  precio: 110, deposito: 40,  requiereFicha: false, activo: true  },
      { id: 's5', nombre: 'Mechas balayage',      descripcion: 'Degradado natural con técnica californiana',  duracionMin: 150, precio: 250, deposito: 80,  requiereFicha: false, activo: false },
    ],
  },
  {
    id: 'cat2',
    nombre: 'Uñas',
    color: 'var(--success)',
    servicios: [
      { id: 's6', nombre: 'Manicure',          descripcion: 'Limpieza, forma y esmaltado a elegir',   duracionMin: 50,  precio: 45,  deposito: 20, requiereFicha: false, activo: true },
      { id: 's7', nombre: 'Pedicure',          descripcion: 'Tratamiento completo pies + esmaltado',  duracionMin: 60,  precio: 55,  deposito: 20, requiereFicha: false, activo: true },
      { id: 's8', nombre: 'Gel completo',      descripcion: 'Esculpido en gel, duración hasta 3 sem', duracionMin: 90,  precio: 85,  deposito: 30, requiereFicha: false, activo: true },
      { id: 's9', nombre: 'Nail art premium',  descripcion: 'Diseño personalizado + piedras',         duracionMin: 120, precio: 130, deposito: 50, requiereFicha: false, activo: true },
    ],
  },
  {
    id: 'cat3',
    nombre: 'Tratamientos',
    color: 'var(--info)',
    servicios: [
      { id: 's10', nombre: 'Facial rejuvenecedor', descripcion: 'Limpieza + masaje + mascarilla premium', duracionMin: 75, precio: 140, deposito: 50, requiereFicha: true, activo: true },
      { id: 's11', nombre: 'Depilación IPL',       descripcion: 'Láser pierna completa o bikini',        duracionMin: 60, precio: 180, deposito: 70, requiereFicha: true, activo: true },
    ],
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const variantesGrid     = { visible: { transition: { staggerChildren: 0.05 } } };
const variantesTarjeta  = {
  oculto:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

export default function ServiciosPage() {
  const [catActiva, setCatActiva] = useState<string>('todas');
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const visible =
    catActiva === 'todas' ? CATEGORIAS : CATEGORIAS.filter((c) => c.id === catActiva);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
            Servicios
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {CATEGORIAS.reduce((n, c) => n + c.servicios.length, 0)} servicios · {CATEGORIAS.length} categorías
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-base)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} strokeWidth={2} />
          Nuevo servicio
        </motion.button>
      </div>

      {/* Filtros categoría */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {[{ id: 'todas', nombre: 'Todas' }, ...CATEGORIAS].map((c) => (
          <button key={c.id} onClick={() => setCatActiva(c.id)}
            style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: '1px solid', borderColor: catActiva === c.id ? 'var(--accent)' : 'var(--border-subtle)', background: catActiva === c.id ? 'var(--accent-subtle)' : 'white', color: catActiva === c.id ? 'var(--accent)' : 'var(--ink-muted)', fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease-out' }}>
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Grid por categoría */}
      {visible.map((cat) => (
        <div key={cat.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 'var(--radius-full)', background: cat.color, flexShrink: 0 }} />
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>{cat.nombre}</h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{cat.servicios.length} servicios</span>
          </div>

          <motion.div variants={variantesGrid} initial="oculto" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
            {cat.servicios.map((s) => (
              <motion.div key={s.id} variants={reducedMotion ? undefined : variantesTarjeta}
                style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', opacity: s.activo ? 1 : 0.55, cursor: 'pointer' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>{s.nombre}</h3>
                  <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 600, background: s.activo ? 'var(--success-light)' : 'var(--border-subtle)', color: s.activo ? 'var(--success)' : 'var(--ink-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', margin: 0, lineHeight: 'var(--leading-snug)' }}>{s.descripcion}</p>

                <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--ink-muted)' }}>
                    <Clock size={12} strokeWidth={1.5} />
                    <span style={{ fontSize: 'var(--text-xs)' }}>{s.duracionMin} min</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--ink-muted)' }}>
                    <Tag size={12} strokeWidth={1.5} />
                    <span style={{ fontSize: 'var(--text-xs)' }}>S/ {s.precio}</span>
                  </div>
                  {s.requiereFicha && (
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--warning)', background: 'var(--warning-light)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
                      Ficha salud
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                  Depósito: <strong style={{ color: 'var(--ink-strong)' }}>S/ {s.deposito}</strong>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}
    </motion.div>
  );
}
