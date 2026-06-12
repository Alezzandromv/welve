import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-bg gap-4 p-6 text-center">
      <ShieldOff size={32} strokeWidth={1.5} className="text-ink-muted" />
      <h1 className="m-0 text-xl font-semibold text-ink-strong">
        Acceso no autorizado
      </h1>
      <p className="m-0 text-sm text-ink-muted max-w-[36ch]">
        No tienes permisos para ver esta página.
      </p>
      <Link
        to="/login"
        className="mt-2 text-sm font-medium text-accent no-underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
