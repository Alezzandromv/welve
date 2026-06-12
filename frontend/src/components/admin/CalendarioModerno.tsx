import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { ICita } from '@/types/citas';

interface CalendarioModernoProps {
  citas: ICita[];
}

export default function CalendarioModerno({ citas }: CalendarioModernoProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const diasSemana = useMemo(() => {
    const dias = [];
    const hoy = new Date();
    for (let i = -2; i <= 4; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      dias.push(fecha);
    }
    return dias;
  }, []);

  const getCitasPorFecha = (fecha: Date) => {
    const fechaStr = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    return citas.filter((c) => c.programada_en.startsWith(fechaStr));
  };

  const formatearHora = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-surface-bg p-4 rounded-3xl relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-ink-strong m-0">
          Agenda Semanal
        </h3>
      </div>

      <div className="flex gap-2 relative">
        {diasSemana.map((fecha, idx) => {
          const isToday = idx === 2;
          const fechaStr = fecha.toLocaleDateString('en-CA');
          const citasDia = getCitasPorFecha(fecha);
          const hasCitas = citasDia.length > 0;

          return (
            <div
              key={fechaStr}
              onMouseEnter={() => setHoveredDate(fechaStr)}
              onMouseLeave={() => setHoveredDate(null)}
              style={{
                transform: hoveredDate === fechaStr ? 'translateY(-4px)' : 'none',
                background: isToday ? 'var(--accent)' : 'var(--surface-sidebar)',
                color: isToday ? 'white' : 'var(--sidebar-ink-base)',
              }}
              className="flex-1 flex flex-col items-center p-3 rounded-2xl cursor-pointer relative transition-transform duration-200"
            >
              <span className="text-xs font-medium uppercase opacity-80">
                {fecha.toLocaleDateString('es-PE', { weekday: 'short' })}
              </span>
              <span className="text-xl font-bold mt-1">
                {fecha.getDate()}
              </span>

              {hasCitas && (
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2"
                  style={{ background: isToday ? 'white' : 'var(--turbo)' }}
                />
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredDate === fechaStr && hasCitas && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[110%] left-1/2 -translate-x-1/2 w-max min-w-[220px] bg-surface-raised rounded-2xl p-3 z-dropdown text-ink-base pointer-events-none text-left shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                  >
                    <div className="text-xs font-semibold text-ink-muted mb-2">
                      {citasDia.length} {citasDia.length === 1 ? 'Cita' : 'Citas'} programadas
                    </div>
                    <div className="flex flex-col gap-2">
                      {citasDia.slice(0, 3).map((cita) => (
                        <div key={cita.id} className="flex items-center gap-2 text-xs">
                          <Clock size={12} className="text-accent" />
                          <span className="font-semibold">{formatearHora(cita.programada_en)}</span>
                          <span className="text-ink-muted truncate max-w-[120px]">
                            {cita.nombre_cliente || 'Cliente'}
                          </span>
                        </div>
                      ))}
                      {citasDia.length > 3 && (
                        <div className="text-2xs text-accent font-semibold mt-1">
                          + {citasDia.length - 3} más...
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
