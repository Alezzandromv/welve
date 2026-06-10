import { useState } from "react";
import { authService } from "@/services/auth.service";

export default function LoginPage() {
  const [telefono, setTelefono] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      await authService.solicitarAcceso(telefono);
      setEnviado(true);
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Revisa tu WhatsApp — te enviamos el enlace de acceso.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold">Eunoia Beauty Salon</h1>
        <input
          type="tel"
          placeholder="Tu número de WhatsApp"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />
        <button type="submit" disabled={cargando} className="bg-black text-white rounded px-4 py-2">
          {cargando ? "Enviando..." : "Recibir enlace de acceso"}
        </button>
      </form>
    </div>
  );
}
