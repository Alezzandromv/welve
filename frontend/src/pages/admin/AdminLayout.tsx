import { useEffect, useRef, useState } from 'react';
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
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 56;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface NavItemConfig {
  icon: React.ElementType;
  label: string;
  to: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/admin/dashboard' },
  { icon: CalendarDays,    label: 'Agenda',        to: '/admin/agenda' },
  { icon: Users,           label: 'Clientes',      to: '/admin/clientes' },
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

interface SidebarNavItemProps {
  item: NavItemConfig;
  showLabels: boolean;
}

function SidebarNavItem({ item, showLabels }: SidebarNavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipY, setTooltipY] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  const handleHoverStart = () => {
    if (!showLabels && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipY(rect.top + rect.height / 2);
      setShowTooltip(true);
    }
  };

  return (
    <div ref={wrapperRef}>
      <NavLink to={item.to} end style={{ textDecoration: 'none', display: 'block' }}>
        {({ isActive }) => (
          <motion.div
            whileHover={{ x: showLabels && !isActive ? 4 : 0 }}
            onHoverStart={handleHoverStart}
            onHoverEnd={() => setShowTooltip(false)}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: showLabels ? 'flex-start' : 'center',
              gap: 10,
              padding: showLabels ? 'var(--space-3) var(--space-4)' : 'var(--space-3) 0',
              borderRadius: isActive ? 'var(--radius-xl)' : 'var(--radius-lg)',
              background: isActive
                ? 'var(--accent)'
                : 'transparent',
              color: isActive ? 'var(--accent-foreground)' : 'var(--sidebar-ink-base)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 600 : 400,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            whileHover={isActive ? {} : {
              x: showLabels ? 4 : 0,
              backgroundColor: 'oklch(0.51 0.261 286 / 0.12)',
            }}
          >
            <Icon size={18} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {showLabels && (
                <motion.span
                  key={item.to}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15, delay: 0.1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </NavLink>

      {!showLabels && showTooltip &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: tooltipY,
              left: SIDEBAR_COLLAPSED + 8,
              transform: 'translateY(-50%)',
              background: 'var(--surface-raised)',
              color: 'var(--ink-strong)',
              padding: '4px var(--space-2)',
              borderRadius: 'var(--radius-base)',
              fontSize: 'var(--text-xs)',
              boxShadow: 'var(--shadow-base)',
              zIndex: 600,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
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
    <div
      style={{
        height: 1,
        background: 'var(--sidebar-border)',
        margin: 'var(--space-2) 0',
        flexShrink: 0,
      }}
    />
  );
}

interface LogoutBtnProps {
  showLabel: boolean;
  onLogout: () => void;
}

function LogoutBtn({ showLabel, onLogout }: LogoutBtnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onLogout}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Cerrar sesión"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: showLabel ? 10 : 0,
        justifyContent: showLabel ? 'flex-start' : 'center',
        padding: showLabel ? 'var(--space-2) var(--space-3)' : 'var(--space-2) 0',
        borderRadius: 'var(--radius-lg)',
        background: hovered ? 'oklch(0.57 0.21 22 / 0.1)' : 'transparent',
        border: 'none',
        color: hovered ? 'var(--error)' : 'var(--sidebar-ink-muted)',
        cursor: 'pointer',
        transition: 'color 150ms, background 150ms',
        fontSize: 'var(--text-sm)',
      }}
    >
      <LogOut size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
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

  useEffect(() => {
    if (isDesktop) setExpanded(true);
    else if (isTabletOrMore) setExpanded(false);
    else setDrawerOpen(false);
  }, [isDesktop, isTabletOrMore]);

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  const iniciales = usuario ? obtenerIniciales(usuario.nombre_completo) : '?';
  const showLabels = expanded || isMobile;

  const sidebarBorderRadius = isMobile ? '0' : '0 16px 16px 0';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-bg)' }}>

      {/* Overlay móvil */}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'oklch(0.12 0.038 288 / 0.6)',
              zIndex: 300,
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={
          isMobile
            ? { x: drawerOpen ? 0 : -SIDEBAR_EXPANDED, width: SIDEBAR_EXPANDED }
            : { x: 0, width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }
        }
        transition={{ duration: 0.3, ease: EASE }}
        style={{
          ...(isMobile
            ? { position: 'fixed' as const, top: 0, left: 0, zIndex: 400 }
            : { position: 'relative' as const }),
          height: '100vh',
          background: 'var(--surface-sidebar)',
          borderRadius: sidebarBorderRadius,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        aria-label="Navegación principal"
      >
        {/* Cabecera: logo + toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: showLabels ? 'var(--space-5) var(--space-4)' : 'var(--space-5) var(--space-3)',
            flexShrink: 0,
            minHeight: 64,
          }}
        >
          <AnimatePresence mode="wait">
            {showLabels ? (
              <motion.div
                key="logo-completo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Scissors size={14} strokeWidth={2} color="white" />
                </div>
                <span
                  style={{
                    color: 'var(--sidebar-ink-strong)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    letterSpacing: 'var(--tracking-tight)',
                    userSelect: 'none',
                  }}
                >
                  Eunoia
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-corto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scissors size={14} strokeWidth={2} color="white" />
              </motion.div>
            )}
          </AnimatePresence>

          {isMobile ? (
            <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú" style={estiloIconBtn()}>
              <X size={16} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={() => setExpanded((p) => !p)}
              aria-label={expanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
              style={estiloIconBtn()}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-ink-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-ink-muted)'; }}
            >
              {expanded ? <ChevronLeft size={15} strokeWidth={1.5} /> : <ChevronRight size={15} strokeWidth={1.5} />}
            </button>
          )}
        </div>

        <Divider />

        {/* Navegación */}
        <nav
          aria-label="Menú de administración"
          style={{
            flex: 1,
            padding: showLabels ? 'var(--space-2) var(--space-3)' : 'var(--space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.to} item={item} showLabels={showLabels} />
          ))}
        </nav>

        <Divider />

        {/* Sección usuario */}
        <div style={{ padding: showLabels ? 'var(--space-3)' : 'var(--space-2)', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: showLabels ? 10 : 0,
              justifyContent: showLabels ? 'flex-start' : 'center',
              marginBottom: 'var(--space-2)',
              padding: showLabels ? 'var(--space-2)' : 0,
              overflow: 'hidden',
            }}
          >
            <div
              title={usuario?.nombre_completo}
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent)',
                color: 'var(--accent-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 0 0 2px oklch(0.51 0.261 286 / 0.3)',
              }}
            >
              {iniciales}
            </div>
            {showLabels && (
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--sidebar-ink-strong)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {usuario?.nombre_completo ?? ''}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginTop: 2,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'oklch(0.51 0.261 286 / 0.2)',
                    color: 'var(--sidebar-ink-base)',
                    fontSize: 'var(--text-2xs)',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {usuario?.rol ?? ''}
                </div>
              </div>
            )}
          </div>
          <LogoutBtn showLabel={showLabels} onLogout={handleCerrarSesion} />
        </div>
      </motion.aside>

      {/* Área de contenido */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--surface-bg)',
          padding: 'var(--content-padding)',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-base)',
              background: 'var(--surface-base)',
              border: '1px solid var(--border-base)',
              color: 'var(--ink-base)',
              cursor: 'pointer',
              marginBottom: 'var(--space-4)',
              flexShrink: 0,
            }}
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
}

function estiloIconBtn(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 'var(--radius-base)',
    background: 'transparent',
    border: 'none',
    color: 'var(--sidebar-ink-muted)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'color 150ms',
  };
}
