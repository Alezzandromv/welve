import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import type { Rol } from '@/types';

import LoginPage from '@/pages/auth/LoginPage';
import RegistroPage from '@/pages/auth/RegistroPage';
import VerificarTokenPage from '@/pages/VerificarTokenPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import ProtectedRoute from '@/components/ProtectedRoute';

import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AgendaPage from '@/pages/admin/AgendaPage';
import ClientesPage from '@/pages/admin/ClientesPage';
import ServiciosPage from '@/pages/admin/ServiciosPage';
import PagosPage from '@/pages/admin/PagosPage';
import FidelizacionPage from '@/pages/admin/FidelizacionPage';
import ConfiguracionPage from '@/pages/admin/ConfiguracionPage';

import TrabajadorAgenda from '@/pages/worker/Agenda';
import ClienteCitas from '@/pages/client/MisCitas';
import ClienteReservar from '@/pages/client/Reservar';

function RedirigirPorRol() {
  const rol = useAuthStore((s) => s.rol);
  if (rol === 'admin') return <Navigate to="/admin" replace />;
  if (rol === 'trabajador') return <Navigate to="/trabajador/agenda" replace />;
  if (rol === 'cliente') return <Navigate to="/cliente/citas" replace />;
  return <Navigate to="/login" replace />;
}

function RutaPublica({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RutaPublica>
            <LoginPage />
          </RutaPublica>
        }
      />
      <Route
        path="/registro"
        element={
          <RutaPublica>
            <RegistroPage />
          </RutaPublica>
        }
      />
      <Route path="/auth" element={<VerificarTokenPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<RedirigirPorRol />} />

      {/* Admin — rutas anidadas con AdminLayout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin'] as Rol[]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<AdminDashboard />} />
        <Route path="agenda"        element={<AgendaPage />} />
        <Route path="clientes"      element={<ClientesPage />} />
        <Route path="servicios"     element={<ServiciosPage />} />
        <Route path="pagos"         element={<PagosPage />} />
        <Route path="fidelizacion"  element={<FidelizacionPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>

      {/* Trabajador */}
      <Route
        path="/trabajador/*"
        element={
          <ProtectedRoute roles={['trabajador', 'admin'] as Rol[]}>
            <Routes>
              <Route path="agenda" element={<TrabajadorAgenda />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Cliente */}
      <Route
        path="/cliente/*"
        element={
          <ProtectedRoute roles={['cliente'] as Rol[]}>
            <Routes>
              <Route path="citas"   element={<ClienteCitas />} />
              <Route path="reservar" element={<ClienteReservar />} />
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
