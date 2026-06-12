import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { citasService } from '@/services/citas.service';

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 88;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface NavItemConfig {
  icon: React.ElementType;
  label: string;
  to: string;
  badge?: number;
}

const BASE_NAV: Omit<NavItemConfig, 'badge'>[] = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/admin/dashboard' },
  { icon: CalendarDays,    label: 'Agenda',        to: '/admin/agenda' },
  { icon: Users,           label: 'Clientes',      to: '/admin/clientes' },
  { icon: UserCog,         label: 'Personal',      to: '/admin/personal' },
  { icon: ShieldCheck,     label: 'Usuarios',      to: '/admin/usuarios' },
  { icon: Scissors,        label: 'Servicios',     to: '/admin/servicios' },
  { icon: CreditCard,      label: 'Pagos',         to: '/admin/pagos' },
  { icon: Gift,            label: 'Fidelización',  to: '/admin/fidelizacion' },
  { icon: Settings,        label: 'Configuración', to: '/admin/configuracion' },
];

function obtenerIniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function PulseDot() {
  return (
    <motion.span
      animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0.5, 0.9] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-block w-[7px] h-[7px] rounded-full bg-accent shrink-0"
    />
  );
}

interface SidebarNavItemProps {
  item: NavItemConfig;
  showLabels: boolean;
}

function SidebarNavItem({ item, showLabels }: SidebarNavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipY, setTooltipY] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;
  const isCollapsed = !showLabels;

  const handleHoverStart = () => {
    if (isCollapsed && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipY(rect.top + rect.height / 2);
      setShowTooltip(true);
    }
  };

  return (
    <div ref={wrapperRef}>
      <NavLink to={item.to} end className="no-underline block">
        {({ isActive }) => (
          <motion.div
            onHoverStart={handleHoverStart}
            onHoverEnd={() => setShowTooltip(false)}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative flex items-center rounded-2xl text-sm overflow-visible whitespace-nowrap cursor-pointer ${
              isCollapsed ? 'justify-center' : 'justify-start'
            } ${isActive ? 'text-accent font-semibold' : 'text-sidebar-ink-base font-medium'}`}
            style={{
              width: isCollapsed ? 48 : 'auto',
              height: isCollapsed ? 44 : 'auto',
              margin: isCollapsed ? '0 auto' : '0 16px',
              padding: isCollapsed ? 0 : '12px 16px',
              gap: isCollapsed ? 0 : 12,
              background: isActive ? 'oklch(0.51 0.261 286 / 0.12)' : 'transparent',
            }}
            whileHover={
              isActive
                ? {}
                : {
                    backgroundColor: 'oklch(0.51 0.261 286 / 0.05)',
                    scale: isCollapsed ? 1.05 : 1,
                  }
            }
          >
            <Icon size={isCollapsed ? 22 : 18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />

            <AnimatePresence>
              {showLabels && (
                <motion.span
                  key={item.to}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15, delay: 0.08 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  className="flex-1"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {showLabels && item.badge !== undefined && item.badge > 0 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-[2px] px-2 rounded-full bg-turbo text-2xs font-bold shrink-0"
                style={{ color: 'oklch(0.12 0.038 288)' }}
              >
                {item.badge}
              </motion.span>
            )}

            {isCollapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-2 right-2 w-[10px] h-[10px] rounded-full bg-turbo border-2 border-surface-sidebar" />
            )}
          </motion.div>
        )}
      </NavLink>

      {isCollapsed && showTooltip &&
        createPortal(
          <div
            className="fixed -translate-y-1/2 bg-surface-raised text-ink-strong py-1.5 px-3 rounded-lg text-xs font-medium shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-tooltip pointer-events-none whitespace-nowrap"
            style={{ top: tooltipY, left: SIDEBAR_COLLAPSED + 12 }}
          >
            {item.label}
          </div>,
          document.body
        )}
    </div>
  );
}

function Divider() {
  return (
    <div className="h-px bg-sidebar-border opacity-40 my-2 mx-6 shrink-0" />
  );
}

interface LogoutSectionProps {
  showLabel: boolean;
  onLogout: () => void;
}

function LogoutSection({ showLabel, onLogout }: LogoutSectionProps) {
  const [confirmando, setConfirmando] = useState(false);
  const isCollapsed = !showLabel;

  if (confirmando && showLabel) {
    return (
      <div
        className="flex items-center gap-2 py-3 px-4 mx-4 rounded-2xl"
        style={{ background: 'oklch(0.57 0.21 22 / 0.1)' }}
      >
        <span className="flex-1 text-xs text-sidebar-ink-muted">
          ¿Salir?
        </span>
        <button
          onClick={onLogout}
          className="py-1 px-3 rounded-lg bg-error text-white border-none text-xs font-semibold cursor-pointer"
        >
          Sí
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="py-1 px-3 rounded-lg bg-sidebar-border text-sidebar-ink-base border-none text-xs font-semibold cursor-pointer"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => (showLabel ? setConfirmando(true) : onLogout())}
      aria-label="Cerrar sesión"
      className={`flex items-center rounded-2xl bg-transparent border-none text-sidebar-ink-muted cursor-pointer transition-[color,background] duration-200 text-sm font-medium hover:text-error ${
        isCollapsed
          ? 'w-12 h-12 mx-auto my-0 gap-0 justify-center p-0'
          : 'w-[calc(100%-32px)] h-auto mx-4 my-0 gap-3 justify-start py-3 px-4'
      }`}
      onMouseEnter={(e) => {
        (e.currentTarget).style.background = 'oklch(0.57 0.21 22 / 0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget).style.background = 'transparent';
      }}
    >
      <LogOut size={isCollapsed ? 20 : 18} strokeWidth={1.5} className="shrink-0" />
      {showLabel && <span>Cerrar sesión</span>}
    </button>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  const isTabletOrMore = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isMobile = !isTabletOrMore;

  const [expanded, setExpanded] = useState(
    () => window.matchMedia('(min-width: 1025px)').matches
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [citasPendientes, setCitasPendientes] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      if (isDesktop) setExpanded(true);
      else if (isTabletOrMore) setExpanded(false);
      else setDrawerOpen(false);
    });
  }, [isDesktop, isTabletOrMore]);

  useEffect(() => {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    citasService
      .obtenerCitasAdmin({ fecha: hoy })
      .then((citas) =>
        setCitasPendientes(citas.filter((c) => c.estado === 'pendiente').length)
      )
      .catch(() => {});
  }, []);

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  const iniciales = usuario ? obtenerIniciales(usuario.nombre_completo) : '?';
  const showLabels = expanded || isMobile;

  const navItems: NavItemConfig[] = useMemo(
    () =>
      BASE_NAV.map((item) =>
        item.to === '/admin/agenda'
          ? { ...item, badge: citasPendientes > 0 ? citasPendientes : undefined }
          : item
      ),
    [citasPendientes]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">

      <AnimatePresence>
        {isMobile && drawerOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-modal-backdrop"
            style={{ background: 'oklch(0.12 0.038 288 / 0.6)' }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={
          isMobile
            ? { x: drawerOpen ? 0 : -SIDEBAR_EXPANDED, width: SIDEBAR_EXPANDED }
            : { x: 0, width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }
        }
        transition={{ duration: 0.4, ease: EASE }}
        className="h-screen bg-surface-sidebar flex flex-col overflow-visible shrink-0"
        style={{
          ...(isMobile
            ? { position: 'fixed' as const, top: 0, left: 0, zIndex: 'var(--z-modal)' as unknown as number }
            : { position: 'relative' as const }),
          borderRadius: isMobile ? '0' : '0 48px 48px 0',
          borderRight: 'none',
          boxShadow: isMobile ? 'none' : '4px 0 24px rgba(0,0,0,0.03)',
        }}
        aria-label="Navegación principal"
      >
        {/* Header */}
        <div
          className={`flex items-center shrink-0 min-h-[88px] ${
            showLabels ? 'flex-row justify-between gap-0 pt-8 px-6 pb-6' : 'flex-col justify-center gap-5 pt-8 px-0 pb-6'
          }`}
        >
          <AnimatePresence mode="wait">
            {showLabels ? (
              <motion.div
                key="logo-completo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center shrink-0">
                  <Scissors size={16} strokeWidth={2} color="white" />
                </div>
                <span className="text-sidebar-ink-strong text-lg font-bold tracking-tight select-none">
                  Eunoia
                </span>
                <PulseDot />
              </motion.div>
            ) : (
              <motion.div
                key="logo-corto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
              >
                <Scissors size={18} strokeWidth={2} color="white" />
              </motion.div>
            )}
          </AnimatePresence>

          {isMobile ? (
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="flex items-center justify-center bg-transparent border-none text-sidebar-ink-muted cursor-pointer p-0 shrink-0 transition-all duration-200"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={() => setExpanded((p) => !p)}
              aria-label={expanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
              className="flex items-center justify-center bg-surface-base border border-border-base rounded-full w-7 h-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-sidebar-ink-muted cursor-pointer p-0 shrink-0 transition-all duration-200 hover:text-sidebar-ink-strong"
            >
              {expanded ? <ChevronLeft size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav
          aria-label="Menú de administración"
          className={`flex-1 py-4 flex flex-col overflow-y-auto overflow-x-hidden ${showLabels ? 'gap-1' : 'gap-1.5'}`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(0.51 0.261 286 / 0.2) transparent' }}
        >
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} item={item} showLabels={showLabels} />
          ))}
        </nav>

        <Divider />

        <div className="py-6 shrink-0 flex flex-col gap-2">
          <button
            onClick={() => navigate('/admin/perfil')}
            aria-label="Ver perfil"
            className={`bg-transparent border-none cursor-pointer flex items-center transition-[background] duration-200 ${
              showLabels
                ? 'w-[calc(100%-32px)] h-auto mx-4 my-0 gap-3 justify-start py-2 px-3 rounded-2xl'
                : 'w-12 h-12 mx-auto my-0 gap-0 justify-center p-0 rounded-full'
            }`}
            onMouseEnter={(e) => { (e.currentTarget).style.background = 'var(--surface-sidebar-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; }}
          >
            {usuario?.foto_perfil_url ? (
              <img
                src={usuario.foto_perfil_url}
                alt={usuario.nombre_completo}
                className={`rounded-full object-cover shrink-0 ${showLabels ? 'w-9 h-9' : 'w-10 h-10'}`}
                style={{ boxShadow: '0 0 0 2px oklch(0.51 0.261 286 / 0.2)' }}
              />
            ) : (
              <div
                title={usuario?.nombre_completo}
                className={`rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shrink-0 ${
                  showLabels ? 'w-9 h-9' : 'w-10 h-10'
                }`}
                style={{ boxShadow: '0 0 0 2px oklch(0.51 0.261 286 / 0.2)' }}
              >
                {iniciales}
              </div>
            )}
            {showLabels && (
              <div className="overflow-hidden min-w-0 text-left">
                <div className="text-sidebar-ink-strong text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                  {usuario?.nombre_completo ?? ''}
                </div>
                <div className="text-sidebar-ink-muted text-xs font-medium capitalize mt-0.5">
                  {usuario?.rol ?? ''}
                </div>
              </div>
            )}
          </button>

          <LogoutSection showLabel={showLabels} onLogout={handleCerrarSesion} />
        </div>
      </motion.aside>

      <main
        className="flex-1 overflow-auto bg-surface-bg min-w-0 flex flex-col"
        style={{ padding: 'var(--content-padding)' }}
      >
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="inline-flex items-center justify-center self-start w-10 h-10 rounded-xl bg-surface-base border border-border-base text-ink-base cursor-pointer mb-4 shrink-0"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
}
