import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-bg)",
        fontFamily: "var(--font-sans)",
        gap: "1rem",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <ShieldOff size={32} strokeWidth={1.5} style={{ color: "var(--ink-muted)" }} />
      <h1
        style={{
          margin: 0,
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--ink-strong)",
        }}
      >
        Acceso no autorizado
      </h1>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-muted)", maxWidth: "36ch" }}>
        No tienes permisos para ver esta página.
      </p>
      <Link
        to="/login"
        style={{
          marginTop: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
