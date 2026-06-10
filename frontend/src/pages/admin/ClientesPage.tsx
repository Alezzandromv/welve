import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, ShieldOff, UserCheck } from 'lucide-react';

type EstadoCliente = 'activa' | 'bloqueada';

interface IClienteRow {
  id: string;
  nombre: string;
  iniciales: string;
  telefono: string;
  canal: string;
  etiquetas: string[];
  ultimaCita: string;
  totalCitas: number;
  estado: EstadoCliente;
}

const ETIQUETA_CFG: Record<string, { label: string; color: string; bg: string }> = {
  vip:        { label: 'VIP',        color: 'var(--warning)',  bg: 'var(--warning-light)' },
  nueva:      { label: 'Nueva',      color: 'var(--info)',      bg: 'var(--info-light)' },
  fidelizada: { label: 'Fidelizada', color: 'var(--success)',   bg: 'var(--success-light)' },
  frecuente:  { label: 'Frecuente',  color: 'var(--accent)',    bg: 'var(--accent-subtle)' },
};

const CLIENTES: IClienteRow[] = [
  { id: 'c1', nombre: 'Valentina Torres', iniciales: 'VT', telefono: '+51 987 654 321', canal: 'WhatsApp',  etiquetas: ['vip','fidelizada'], ultimaCita: '10 jun 2026', totalCitas: 24, estado: 'activa'    },
  { id: 'c2', nombre: 'Camila Ríos',      iniciales: 'CR', telefono: '+51 912 345 678', canal: 'Instagram', etiquetas: ['frecuente'],         ultimaCita: '10 jun 2026', totalCitas: 12, estado: 'activa'    },
  { id: 'c3', nombre: 'Daniela Cruz',     iniciales: 'DC', telefono: '+51 923 456 789', canal: 'Referida',  etiquetas: ['nueva'],              ultimaCita: '10 jun 2026', totalCitas: 3,  estado: 'activa'    },
  { id: 'c4', nombre: 'Rosa Medina',      iniciales: 'RM', telefono: '+51 934 567 890', canal: 'WhatsApp',  etiquetas: ['vip'],                ultimaCita: '7 jun 2026',  totalCitas: 18, estado: 'activa'    },
  { id: 'c5', nombre: 'Patricia Díaz',    iniciales: 'PD', telefono: '+51 945 678 901', canal: 'Web',       etiquetas: ['fidelizada'],         ultimaCita: '3 jun 2026',  totalCitas: 31, estado: 'activa'    },
  { id: 'c6', nombre: 'Carmen Santos',    iniciales: 'CS', telefono: '+51 956 789 012', canal: 'WhatsApp',  etiquetas: [],                     ultimaCita: '28 may 2026', totalCitas: 7,  estado: 'activa'    },
  { id: 'c7', nombre: 'Isabel Flores',    iniciales: 'IF', telefono: '+51 967 890 123', canal: 'Instagram', etiquetas: ['nueva'],              ultimaCita: '15 may 2026', totalCitas: 2,  estado: 'activa'    },
  { id: 'c8', nombre: 'Elena Mora',       iniciales: 'EM', telefono: '+51 978 901 234', canal: 'WhatsApp',  etiquetas: [],                     ultimaCita: '2 may 2026',  totalCitas: 5,  estado: 'bloqueada' },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const variantesLista = { visible: { transition: { staggerChildren: 0.04 } } };
const variantesFila  = { oculto: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } };

export default function ClientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | EstadoCliente>('todos');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const filtradas = CLIENTES.filter((c) => {
    const b = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda);
    const e = filtro === 'todos' || c.estado === filtro;
    return b && e;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: 'var(--tracking-tight)', margin: 0 }}>
            Clientes
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {CLIENTES.length} clientas registradas
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'white', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-base)', padding: 'var(--space-2) var(--space-3)', width: 220 }}>
          <Search size={13} strokeWidth={1.5} style={{ color: 'var(--ink-subtle)', flexShrink: 0 }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o teléfono…"
            style={{ border: 'none', background: 'transparent', fontSize: 'var(--text-sm)', color: 'var(--ink-base)', outline: 'none', width: '100%', fontFamily: 'var(--font-sans)' }} />
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-base)', background: 'var(--accent)', color: 'var(--accent-foreground)', border: 'none', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} strokeWidth={2} />
          Nueva clienta
        </motion.button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {(['todos', 'activa', 'bloqueada'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: '1px solid', borderColor: filtro === f ? 'var(--accent)' : 'var(--border-subtle)', background: filtro === f ? 'var(--accent-subtle)' : 'white', color: filtro === f ? 'var(--accent)' : 'var(--ink-muted)', fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease-out' }}>
            {f === 'todos' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'todos' && <span style={{ marginLeft: 4 }}>({CLIENTES.filter((c) => c.estado === f).length})</span>}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-base)', gap: 'var(--space-4)' }}>
          {['Cliente', 'Canal', 'Etiquetas', 'Última cita', ''].map((col) => (
            <span key={col} style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</span>
          ))}
        </div>

        <motion.div variants={variantesLista} initial="oculto" animate="visible">
          {filtradas.map((c) => (
            <motion.div key={c.id} variants={reducedMotion ? undefined : variantesFila}
              onMouseEnter={() => setHoverId(c.id)} onMouseLeave={() => setHoverId(null)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-subtle)', gap: 'var(--space-4)', alignItems: 'center', background: hoverId === c.id ? 'oklch(0.93 0.028 284 / 0.4)' : 'transparent', transition: 'background 120ms ease-out', cursor: 'pointer' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', background: c.estado === 'bloqueada' ? 'var(--error-light)' : 'var(--accent-subtle)', color: c.estado === 'bloqueada' ? 'var(--error)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0 }}>
                  {c.iniciales}
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink-strong)' }}>{c.nombre}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>{c.telefono}</div>
                </div>
              </div>

              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)' }}>{c.canal}</span>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {c.etiquetas.map((e) => {
                  const cfg = ETIQUETA_CFG[e];
                  return cfg ? (
                    <span key={e} style={{ padding: '2px 7px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-2xs)', fontWeight: 600, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  ) : null;
                })}
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-base)' }}>{c.ultimaCita}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 1 }}>{c.totalCitas} citas</div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', opacity: hoverId === c.id ? 1 : 0, transition: 'opacity 150ms' }}>
                {c.estado === 'activa' ? (
                  <button title="Bloquear" style={{ width: 28, height: 28, borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ShieldOff size={12} strokeWidth={1.5} />
                  </button>
                ) : (
                  <button title="Desbloquear" style={{ width: 28, height: 28, borderRadius: 'var(--radius-base)', border: '1px solid var(--border-subtle)', background: 'white', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <UserCheck size={12} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filtradas.length === 0 && (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>No se encontraron clientas con ese criterio.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
