import { create } from 'zustand';
import { citasService } from '@/services/citas.service';
import { pagosService } from '@/services/pagos.service';
import { personalService } from '@/services/personal.service';
import type { ICita } from '@/types/citas';
import type { IPago } from '@/types/pagos';
import type { IPersonal } from '@/types/personal';

interface DashboardState {
  citas: ICita[];
  pagosPendientes: IPago[];
  personalActivo: IPersonal[];
  cargando: boolean;
  error: string | null;
  cargarDatos: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  citas: [],
  pagosPendientes: [],
  personalActivo: [],
  cargando: true,
  error: null,

  cargarDatos: async () => {
    set({ cargando: true, error: null });
    try {
      // Hacemos el fetch en paralelo para mayor velocidad
      const [citasData, pagosData, personalData] = await Promise.all([
        citasService.obtenerMisCitas(),
        pagosService.obtenerPagosPendientes(),
        personalService.obtenerPersonal(),
      ]);

      set({
        citas: citasData,
        pagosPendientes: pagosData,
        personalActivo: personalData.filter((p) => p.esta_activo),
        cargando: false,
      });
    } catch {
      set({ error: 'No se pudieron cargar los datos del dashboard.', cargando: false });
    }
  },
}));