import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AxiosError } from 'axios';
import {
  AlertCircle, Check, Clock, Pencil, Plus,
  Scissors, Tag, Trash2, X,
} from 'lucide-react';
import { serviciosService } from '@/services/servicios.service';
import type { ICategoria, IServicio, IServicioCreate, IServicioUpdate, ICategoriaCreate } from '@/types/servicios';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModoPanel = 'crear' | 'editar';

interface PanelServicioState {
  modo: ModoPanel;
  servicio?: IServicio;
}

interface PanelCategoriaState {
  modo: ModoPanel;
  categoria?: ICategoria;
}

interface ToastMsg {
  id: string;
  tipo: 'success' | 'error';
  texto: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const schemaServicio = z.object({
  nombre:                        z.string().min(2, 'Mínimo 2 caracteres'),
  categoria_id:                  z.string().min(1, 'Selecciona una categoría'),
  duracion_minutos:              z.number({ error: 'Ingresa un número' }).min(5, 'Mínimo 5 min').max(240, 'Máximo 240 min'),
  precio:                        z.number({ error: 'Ingresa un número' }).positive('El precio debe ser mayor a 0'),
  monto_deposito:                z.number({ error: 'Ingresa un número' }).min(0, 'No puede ser negativo'),
  requiere_ficha_salud:          z.boolean(),
  horas_cancelacion_sin_penalidad: z.number().int().min(1).max(24),
  esta_activo:                   z.boolean(),
});

const schemaCategoria = z.object({
  nombre:               z.string().min(1, 'Requerido').max(50, 'Máximo 50 caracteres'),
  orden_visualizacion:  z.number().int().min(0),
  esta_activo:          z.boolean(),
});

type FormServicioValues  = z.infer<typeof schemaServicio>;
type FormCategoriaValues = z.infer<typeof schemaCategoria>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractApiError(err: unknown, fallback: string): string {
  const axErr = err as AxiosError<{ detail?: string }>;
  return axErr.response?.data?.detail ?? fallback;
}

function formatPrecio(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-10 h-6 rounded-full border-none cursor-pointer shrink-0 transition-colors duration-200 ${
        value ? 'bg-accent' : 'bg-border-base'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <motion.div
        animate={{ x: value ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

// ─── SliderInput ──────────────────────────────────────────────────────────────

function SliderInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
      style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border-subtle) ${pct}%)` }}
    />
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

function FormField({ label, error, children, helper }: { label: string; error?: string; children: React.ReactNode; helper?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{label}</label>
      {children}
      {error  && <p className="text-xs text-error">{error}</p>}
      {!error && helper && <p className="text-xs text-ink-subtle">{helper}</p>}
    </div>
  );
}

function inputCls(hasError?: boolean): string {
  return `px-3 py-2.5 rounded-lg border text-sm text-ink-base bg-surface-bg outline-none transition-colors w-full ${
    hasError ? 'border-error' : 'border-border-base focus:border-accent'
  }`;
}

// ─── ToastItem ────────────────────────────────────────────────────────────────

function ToastItem({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${
        msg.tipo === 'success' ? 'bg-success text-white' : 'bg-error text-white'
      }`}
    >
      {msg.tipo === 'success' ? <Check size={14} strokeWidth={2.5} /> : <AlertCircle size={14} strokeWidth={2.5} />}
      {msg.texto}
    </motion.div>
  );
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────

function ErrorBanner({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-error-light border border-error rounded-xl px-4 py-3">
      <AlertCircle size={16} className="text-error shrink-0" strokeWidth={2} />
      <p className="text-sm text-error flex-1">{mensaje}</p>
      <button onClick={onReintentar}
        className="text-xs font-semibold text-error underline underline-offset-2 cursor-pointer bg-transparent border-none">
        Reintentar
      </button>
    </div>
  );
}

// ─── PanelServicio ────────────────────────────────────────────────────────────

interface PanelServicioProps {
  estado: PanelServicioState;
  categorias: ICategoria[];
  reducedMotion: boolean;
  onGuardar: (data: IServicioCreate | IServicioUpdate, id?: string) => Promise<void>;
  onCerrar: () => void;
}

function PanelServicio({ estado, categorias, reducedMotion, onGuardar, onCerrar }: PanelServicioProps) {
  const [guardando, setGuardando] = useState(false);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const esEdicion = estado.modo === 'editar' && !!estado.servicio;

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormServicioValues>({
    resolver: zodResolver(schemaServicio),
    defaultValues: esEdicion && estado.servicio ? {
      nombre:                          estado.servicio.nombre,
      categoria_id:                    estado.servicio.categoria_id,
      duracion_minutos:                estado.servicio.duracion_minutos,
      precio:                          estado.servicio.precio,
      monto_deposito:                  estado.servicio.monto_deposito,
      requiere_ficha_salud:            estado.servicio.requiere_ficha_salud,
      horas_cancelacion_sin_penalidad: estado.servicio.horas_cancelacion_sin_penalidad,
      esta_activo:                     estado.servicio.esta_activo,
    } : {
      nombre: '', categoria_id: categorias[0]?.id ?? '',
      duracion_minutos: 60, precio: 0, monto_deposito: 0,
      requiere_ficha_salud: false, horas_cancelacion_sin_penalidad: 5, esta_activo: true,
    },
  });

  const onSubmit = async (values: FormServicioValues) => {
    setGuardando(true);
    setErrorPanel(null);
    try {
      await onGuardar(values, estado.servicio?.id);
    } catch (err) {
      setErrorPanel(extractApiError(err, 'Error al guardar el servicio'));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-modal-backdrop"
        style={{ background: 'oklch(0.12 0.038 288 / 0.5)' }}
        onClick={onCerrar}
      />
      <motion.div
        initial={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: EASE }}
        className="fixed inset-y-0 right-0 w-[480px] bg-surface-raised flex flex-col z-modal shadow-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-base shrink-0">
          <h2 className="text-xl font-semibold text-ink-strong">
            {esEdicion ? `Editar ${estado.servicio!.nombre}` : 'Nuevo servicio'}
          </h2>
          <button onClick={onCerrar}
            className="w-8 h-8 rounded-full border border-border-base flex items-center justify-center text-ink-muted hover:text-ink-strong cursor-pointer transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex flex-col gap-5 px-6 py-6">
            {errorPanel && (
              <div className="flex items-start gap-3 bg-error-light border border-error rounded-xl p-3.5">
                <AlertCircle size={14} className="text-error shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-sm text-error">{errorPanel}</p>
              </div>
            )}

            <FormField label="Nombre" error={errors.nombre?.message}>
              <input {...register('nombre')} placeholder="Nombre del servicio" className={inputCls(!!errors.nombre)} />
            </FormField>

            <FormField label="Categoría" error={errors.categoria_id?.message}>
              <select {...register('categoria_id')} className={inputCls(!!errors.categoria_id)}>
                <option value="">Selecciona una categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Duración" error={errors.duracion_minutos?.message}>
              <div className="relative flex items-center">
                <Clock size={14} className="absolute left-3 text-ink-subtle shrink-0" strokeWidth={1.5} />
                <input
                  {...register('duracion_minutos', { valueAsNumber: true })}
                  type="number" min={5} max={240} step={5}
                  placeholder="60"
                  className={`${inputCls(!!errors.duracion_minutos)} pl-9 pr-12`}
                />
                <span className="absolute right-3 text-xs text-ink-subtle font-medium">min</span>
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Precio" error={errors.precio?.message}>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-ink-muted font-semibold">S/</span>
                  <input
                    {...register('precio', { valueAsNumber: true })}
                    type="number" min={0} step={0.5} placeholder="0.00"
                    className={`${inputCls(!!errors.precio)} pl-8`}
                  />
                </div>
              </FormField>

              <FormField label="Depósito" error={errors.monto_deposito?.message} helper="0 si no requiere">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-ink-muted font-semibold">S/</span>
                  <input
                    {...register('monto_deposito', { valueAsNumber: true })}
                    type="number" min={0} step={0.5} placeholder="0.00"
                    className={`${inputCls(!!errors.monto_deposito)} pl-8`}
                  />
                </div>
              </FormField>
            </div>

            {/* Requiere ficha */}
            <Controller name="requiere_ficha_salud" control={control} render={({ field }) => (
              <div className="flex items-start gap-3">
                <ToggleSwitch value={field.value} onChange={field.onChange} />
                <div>
                  <p className="text-sm font-medium text-ink-base">Requiere ficha de salud</p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    El sistema alertará a la especialista si la clienta tiene restricciones registradas
                  </p>
                </div>
              </div>
            )} />

            {/* Slider cancelación */}
            <Controller name="horas_cancelacion_sin_penalidad" control={control} render={({ field }) => (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Cancelación gratuita</label>
                  <span className="text-xs font-semibold text-accent">Hasta {field.value}h antes</span>
                </div>
                <SliderInput value={field.value} onChange={field.onChange} min={1} max={24} />
                <div className="flex justify-between text-2xs text-ink-subtle">
                  <span>1h</span>
                  <span>24h</span>
                </div>
              </div>
            )} />

            {/* Esta activo (solo en edición) */}
            {esEdicion && (
              <Controller name="esta_activo" control={control} render={({ field }) => (
                <div className="flex items-center gap-3 pt-1 border-t border-border-subtle">
                  <ToggleSwitch value={field.value} onChange={field.onChange} />
                  <p className="text-sm font-medium text-ink-base">Servicio activo</p>
                </div>
              )} />
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border-subtle px-6 py-4 flex gap-3 shrink-0">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2.5 rounded-lg border border-border-base text-sm font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors">
              Cancelar
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: guardando ? 1 : 0.97 }}
              disabled={guardando}
              className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold border-none cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {guardando ? 'Guardando…' : 'Guardar'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </>,
    document.body,
  );
}

// ─── PanelCategoria ───────────────────────────────────────────────────────────

interface PanelCategoriaProps {
  estado: PanelCategoriaState;
  proximoOrden: number;
  reducedMotion: boolean;
  onGuardar: (data: ICategoriaCreate, id?: string) => Promise<void>;
  onCerrar: () => void;
}

function PanelCategoria({ estado, proximoOrden, reducedMotion, onGuardar, onCerrar }: PanelCategoriaProps) {
  const [guardando, setGuardando] = useState(false);
  const [errorPanel, setErrorPanel] = useState<string | null>(null);
  const esEdicion = estado.modo === 'editar' && !!estado.categoria;

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormCategoriaValues>({
    resolver: zodResolver(schemaCategoria),
    defaultValues: esEdicion && estado.categoria ? {
      nombre: estado.categoria.nombre,
      orden_visualizacion: estado.categoria.orden_visualizacion,
      esta_activo: estado.categoria.esta_activo,
    } : {
      nombre: '', orden_visualizacion: proximoOrden, esta_activo: true,
    },
  });

  const onSubmit = async (values: FormCategoriaValues) => {
    setGuardando(true);
    setErrorPanel(null);
    try {
      await onGuardar(values, estado.categoria?.id);
    } catch (err) {
      setErrorPanel(extractApiError(err, 'Error al guardar la categoría'));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-modal-backdrop"
        style={{ background: 'oklch(0.12 0.038 288 / 0.5)' }}
        onClick={onCerrar}
      />
      <motion.div
        initial={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: EASE }}
        className="fixed inset-y-0 right-0 w-[380px] bg-surface-raised flex flex-col z-modal shadow-modal"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-base shrink-0">
          <h2 className="text-xl font-semibold text-ink-strong">
            {esEdicion ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button onClick={onCerrar}
            className="w-8 h-8 rounded-full border border-border-base flex items-center justify-center text-ink-muted hover:text-ink-strong cursor-pointer transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex flex-col gap-5 px-6 py-6">
            {errorPanel && (
              <div className="flex items-start gap-3 bg-error-light border border-error rounded-xl p-3.5">
                <AlertCircle size={14} className="text-error shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-sm text-error">{errorPanel}</p>
              </div>
            )}

            <FormField label="Nombre" error={errors.nombre?.message}>
              <input {...register('nombre')} placeholder="Nombre de la categoría" className={inputCls(!!errors.nombre)} autoFocus />
            </FormField>

            <FormField label="Orden de visualización" error={errors.orden_visualizacion?.message}>
              <input
                {...register('orden_visualizacion', { valueAsNumber: true })}
                type="number" min={0}
                className={inputCls(!!errors.orden_visualizacion)}
              />
            </FormField>

            {esEdicion && (
              <Controller name="esta_activo" control={control} render={({ field }) => (
                <div className="flex items-center gap-3 pt-1 border-t border-border-subtle">
                  <ToggleSwitch value={field.value} onChange={field.onChange} />
                  <p className="text-sm font-medium text-ink-base">Categoría activa</p>
                </div>
              )} />
            )}
          </div>

          <div className="mt-auto border-t border-border-subtle px-6 py-4 flex gap-3 shrink-0">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2.5 rounded-lg border border-border-base text-sm font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors">
              Cancelar
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: guardando ? 1 : 0.97 }}
              disabled={guardando}
              className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold border-none cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {guardando ? 'Guardando…' : 'Guardar'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </>,
    document.body,
  );
}

// ─── CardServicio ─────────────────────────────────────────────────────────────

interface CardServicioProps {
  servicio: IServicio;
  categoriaNombre: string;
  reducedMotion: boolean;
  confirmandoDelete: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onConfirmarDelete: () => void;
  onCancelarDelete: () => void;
}

function CardServicio({
  servicio, categoriaNombre, reducedMotion,
  confirmandoDelete, onEditar, onEliminar, onConfirmarDelete, onCancelarDelete,
}: CardServicioProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={reducedMotion ? undefined : {
        oculto:  { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEditar}
      className={`relative bg-surface-base rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-shadow duration-150 ${
        hovered ? 'shadow' : 'shadow-sm'
      } ${!servicio.esta_activo ? 'opacity-50' : ''}`}
    >
      {/* Badge inactivo */}
      {!servicio.esta_activo && (
        <span className="absolute top-3 right-3 py-0.5 px-2 rounded-full text-2xs font-semibold bg-error-light text-error">
          Inactivo
        </span>
      )}

      {/* Encabezado */}
      <div className="flex flex-col gap-0.5 pr-10">
        <h3 className="text-base font-semibold text-ink-strong leading-snug">{servicio.nombre}</h3>
        <span className="text-2xs text-ink-muted">{categoriaNombre}</span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="flex items-center gap-1.5 text-ink-base">
          <Clock size={14} className="text-ink-subtle shrink-0" strokeWidth={1.5} />
          {servicio.duracion_minutos} min
        </span>
        <span className="text-ink-subtle">·</span>
        <span className="flex items-center gap-1.5 font-semibold text-ink-strong">
          <Tag size={14} className="text-ink-subtle shrink-0" strokeWidth={1.5} />
          S/ {formatPrecio(servicio.precio)}
        </span>
      </div>

      {/* Pills */}
      <div className="flex gap-2 flex-wrap">
        {servicio.monto_deposito > 0 && (
          <span className="py-0.5 px-2 rounded-full bg-accent-subtle text-accent text-xs font-medium">
            Depósito S/ {formatPrecio(servicio.monto_deposito)}
          </span>
        )}
        {servicio.requiere_ficha_salud && (
          <span className="flex items-center gap-1 py-0.5 px-2 rounded-full bg-warning-light text-warning text-xs font-medium">
            <AlertCircle size={11} strokeWidth={2} />
            Requiere ficha
          </span>
        )}
      </div>

      {/* Footer hover */}
      <div className={`mt-auto pt-3 border-t border-border-subtle transition-opacity duration-150 ${
        hovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <AnimatePresence mode="wait" initial={false}>
          {confirmandoDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-xs font-medium text-ink-muted flex-1">¿Eliminar servicio?</span>
              <button onClick={onCancelarDelete}
                className="py-1 px-2.5 rounded-lg border border-border-base text-xs text-ink-muted bg-white cursor-pointer hover:bg-surface-bg transition-colors">
                No
              </button>
              <button onClick={onConfirmarDelete}
                className="py-1 px-2.5 rounded-lg bg-error-light text-error border border-error text-xs font-semibold cursor-pointer hover:bg-error hover:text-white transition-colors">
                Sí, eliminar
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={onEditar}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border-base text-xs font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors">
                <Pencil size={11} strokeWidth={1.5} />
                Editar
              </button>
              <button onClick={onEliminar}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border-base text-xs font-medium text-ink-muted bg-white cursor-pointer hover:bg-error-light hover:text-error hover:border-error transition-colors">
                <Trash2 size={11} strokeWidth={1.5} />
                Eliminar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface-base rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="h-5 w-36 rounded shimmer animate-shimmer" />
      <div className="h-3 w-20 rounded shimmer animate-shimmer" />
      <div className="flex gap-3">
        <div className="h-3 w-14 rounded shimmer animate-shimmer" />
        <div className="h-3 w-16 rounded shimmer animate-shimmer" />
      </div>
      <div className="h-8 w-full rounded-lg shimmer animate-shimmer mt-auto" />
    </div>
  );
}

// ─── ServiciosPage ────────────────────────────────────────────────────────────

export default function ServiciosPage() {
  const [categorias,       setCategorias]       = useState<ICategoria[]>([]);
  const [servicios,        setServicios]        = useState<IServicio[]>([]);
  const [catActiva,        setCatActiva]        = useState('todas');
  const [cargando,         setCargando]         = useState(true);
  const [errorCarga,       setErrorCarga]       = useState<string | null>(null);
  const [panelServicio,    setPanelServicio]    = useState<PanelServicioState | null>(null);
  const [panelCategoria,   setPanelCategoria]   = useState<PanelCategoriaState | null>(null);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);
  const [toasts,           setToasts]           = useState<ToastMsg[]>([]);
  const [reducedMotion]    = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ─── Data ──────────────────────────────────────────────────────────────────

  const fetchDatos = () => Promise.all([
    serviciosService.obtenerCategorias(),
    serviciosService.obtenerServicios({ incluir_inactivos: true }),
  ]);

  const cargarDatos = () => {
    setCargando(true);
    setErrorCarga(null);
    fetchDatos()
      .then(([cats, svcs]) => { setCategorias(cats); setServicios(svcs); })
      .catch(() => { setErrorCarga('Error al cargar los datos. Verifica la conexión al backend.'); })
      .finally(() => { setCargando(false); });
  };

  useEffect(() => {
    fetchDatos()
      .then(([cats, svcs]) => { setCategorias(cats); setServicios(svcs); })
      .catch(() => { setErrorCarga('Error al cargar los datos. Verifica la conexión al backend.'); })
      .finally(() => { setCargando(false); });
  }, []);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const countPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    servicios.forEach(s => { map[s.categoria_id] = (map[s.categoria_id] ?? 0) + 1; });
    return map;
  }, [servicios]);

  const serviciosFiltrados = useMemo(() =>
    catActiva === 'todas' ? servicios : servicios.filter(s => s.categoria_id === catActiva),
    [servicios, catActiva],
  );

  const categoriaNombrePor = useMemo(() => {
    const map: Record<string, string> = {};
    categorias.forEach(c => { map[c.id] = c.nombre; });
    return map;
  }, [categorias]);

  const proximoOrden = useMemo(() =>
    categorias.length > 0 ? Math.max(...categorias.map(c => c.orden_visualizacion)) + 1 : 0,
    [categorias],
  );

  // ─── Toasts ────────────────────────────────────────────────────────────────

  const agregarToast = (tipo: ToastMsg['tipo'], texto: string) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, tipo, texto }]);
  };

  const quitarToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  // ─── Servicios handlers ────────────────────────────────────────────────────

  const handleGuardarServicio = async (data: IServicioCreate | IServicioUpdate, id?: string) => {
    if (id) {
      const actualizado = await serviciosService.actualizarServicio(id, data as IServicioUpdate);
      setServicios(prev => prev.map(s => s.id === id ? actualizado : s));
    } else {
      const nuevo = await serviciosService.crearServicio(data as IServicioCreate);
      setServicios(prev => [...prev, nuevo]);
    }
    setPanelServicio(null);
    agregarToast('success', 'Servicio guardado');
  };

  const handleEliminarServicio = async (id: string) => {
    try {
      await serviciosService.actualizarServicio(id, { esta_activo: false });
      setServicios(prev => prev.map(s => s.id === id ? { ...s, esta_activo: false } : s));
      agregarToast('success', 'Servicio desactivado');
    } catch {
      agregarToast('error', 'Error al desactivar el servicio');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // ─── Categorías handlers ───────────────────────────────────────────────────

  const handleGuardarCategoria = async (data: ICategoriaCreate, id?: string) => {
    if (id) {
      const actualizada = await serviciosService.actualizarCategoria(id, data);
      setCategorias(prev => prev.map(c => c.id === id ? actualizada : c));
    } else {
      const nueva = await serviciosService.crearCategoria(data);
      setCategorias(prev => [...prev, nueva]);
    }
    setPanelCategoria(null);
    agregarToast('success', 'Categoría guardada');
  };

  const handleEliminarCategoria = async (cat: ICategoria) => {
    const tieneServicios = servicios.some(s => s.categoria_id === cat.id && s.esta_activo);
    if (tieneServicios) {
      agregarToast('error', 'No se puede eliminar: la categoría tiene servicios activos');
      return;
    }
    try {
      await serviciosService.actualizarCategoria(cat.id, { esta_activo: false });
      setCategorias(prev => prev.filter(c => c.id !== cat.id));
      if (catActiva === cat.id) setCatActiva('todas');
      agregarToast('success', 'Categoría eliminada');
    } catch (err) {
      agregarToast('error', extractApiError(err, 'Error al eliminar la categoría'));
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalServicios = servicios.length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-2xl font-bold text-ink-strong tracking-tight">Servicios</h1>
            {!cargando && (
              <span className="py-0.5 px-2.5 rounded-full bg-accent-subtle text-accent text-xs font-bold">
                {totalServicios}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelCategoria({ modo: 'crear' })}
              className="py-2 px-4 rounded-lg border border-border-base text-sm font-medium text-ink-base bg-white cursor-pointer hover:bg-surface-bg transition-colors"
            >
              + Nueva categoría
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setPanelServicio({ modo: 'crear' })}
              className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer hover:bg-accent-hover transition-colors"
            >
              <Plus size={14} strokeWidth={2} />
              Nuevo servicio
            </motion.button>
          </div>
        </div>

        {/* Error */}
        {errorCarga && <ErrorBanner mensaje={errorCarga} onReintentar={cargarDatos} />}

        {/* Layout */}
        <div className="flex gap-6">
          {/* Sidebar categorías — desktop */}
          <div className="hidden md:flex flex-col gap-0.5 w-[220px] shrink-0">
            {/* "Todas" */}
            <SidebarItem
              label="Todas"
              count={totalServicios}
              activa={catActiva === 'todas'}
              reducedMotion={reducedMotion}
              onClick={() => setCatActiva('todas')}
            />
            {cargando
              ? [1, 2, 3].map(i => (
                  <div key={i} className="h-9 rounded-lg shimmer animate-shimmer mx-1 my-0.5" />
                ))
              : categorias.map(cat => (
                  <SidebarItem
                    key={cat.id}
                    label={cat.nombre}
                    count={countPorCategoria[cat.id] ?? 0}
                    activa={catActiva === cat.id}
                    reducedMotion={reducedMotion}
                    puedeEliminar={!(countPorCategoria[cat.id] > 0)}
                    onClick={() => setCatActiva(cat.id)}
                    onEditar={() => setPanelCategoria({ modo: 'editar', categoria: cat })}
                    onEliminar={() => handleEliminarCategoria(cat)}
                  />
                ))
            }
          </div>

          {/* Columna derecha */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Pills móvil */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
              {[{ id: 'todas', nombre: 'Todas' }, ...categorias].map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatActiva(c.id)}
                  className={`shrink-0 py-1.5 px-3.5 rounded-full border text-xs font-medium cursor-pointer transition-all duration-150 ${
                    catActiva === c.id
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border-subtle bg-white text-ink-muted'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>

            {/* Grid */}
            {cargando ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : serviciosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <Scissors size={48} className="text-ink-subtle" strokeWidth={0.75} />
                <div>
                  <p className="text-sm font-semibold text-ink-muted">Sin servicios en esta categoría</p>
                  <p className="text-xs text-ink-subtle mt-1">Agrega el primer servicio para empezar</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPanelServicio({ modo: 'crear' })}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent text-accent-foreground border-none text-sm font-semibold cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2} />
                  Agregar servicio
                </motion.button>
              </div>
            ) : (
              <motion.div
                key={catActiva}
                variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                initial="oculto"
                animate="visible"
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {serviciosFiltrados.map(servicio => (
                  <CardServicio
                    key={servicio.id}
                    servicio={servicio}
                    categoriaNombre={categoriaNombrePor[servicio.categoria_id] ?? '—'}
                    reducedMotion={reducedMotion}
                    confirmandoDelete={confirmDeleteId === servicio.id}
                    onEditar={() => { setConfirmDeleteId(null); setPanelServicio({ modo: 'editar', servicio }); }}
                    onEliminar={() => setConfirmDeleteId(servicio.id)}
                    onConfirmarDelete={() => handleEliminarServicio(servicio.id)}
                    onCancelarDelete={() => setConfirmDeleteId(null)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Panel servicio */}
      <AnimatePresence>
        {panelServicio && (
          <PanelServicio
            key={panelServicio.servicio?.id ?? 'nuevo'}
            estado={panelServicio}
            categorias={categorias}
            reducedMotion={reducedMotion}
            onGuardar={handleGuardarServicio}
            onCerrar={() => setPanelServicio(null)}
          />
        )}
      </AnimatePresence>

      {/* Panel categoría */}
      <AnimatePresence>
        {panelCategoria && (
          <PanelCategoria
            key={panelCategoria.categoria?.id ?? 'nueva'}
            estado={panelCategoria}
            proximoOrden={proximoOrden}
            reducedMotion={reducedMotion}
            onGuardar={handleGuardarCategoria}
            onCerrar={() => setPanelCategoria(null)}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      {createPortal(
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-toast pointer-events-none">
          <AnimatePresence>
            {toasts.map(msg => (
              <ToastItem key={msg.id} msg={msg} onClose={() => quitarToast(msg.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────
// Defined after ServiciosPage to keep exports at top of file.

interface SidebarItemProps {
  label: string;
  count: number;
  activa: boolean;
  reducedMotion: boolean;
  puedeEliminar?: boolean;
  onClick: () => void;
  onEditar?: () => void;
  onEliminar?: () => void;
}

function SidebarItem({ label, count, activa, reducedMotion, puedeEliminar = true, onClick, onEditar, onEliminar }: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors duration-100 group ${
        activa
          ? 'bg-accent-subtle text-accent'
          : 'text-ink-base hover:bg-[oklch(0.93_0.028_284_/_0.5)]'
      }`}
    >
      {/* Indicador de borde izquierdo */}
      {activa && (
        <motion.span
          layoutId={reducedMotion ? undefined : 'cat-active-indicator'}
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-accent"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      <span className={`flex-1 text-sm truncate ${activa ? 'font-semibold text-accent' : 'font-medium text-ink-base'}`}>
        {label}
      </span>
      <span className="text-xs text-ink-subtle shrink-0">{count}</span>

      {/* Acciones hover (solo si tiene handlers) */}
      {(onEditar || onEliminar) && (
        <div className={`flex gap-0.5 transition-opacity duration-100 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={e => e.stopPropagation()}>
          {onEditar && (
            <button
              onClick={e => { e.stopPropagation(); onEditar(); }}
              title="Editar categoría"
              className="w-6 h-6 rounded flex items-center justify-center text-ink-subtle hover:text-ink-base hover:bg-border-subtle cursor-pointer transition-colors"
            >
              <Pencil size={10} strokeWidth={1.5} />
            </button>
          )}
          {onEliminar && (
            <button
              onClick={e => { e.stopPropagation(); if (puedeEliminar) onEliminar(); }}
              title={puedeEliminar ? 'Eliminar categoría' : 'No se puede eliminar: tiene servicios'}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                puedeEliminar
                  ? 'text-ink-subtle hover:text-error hover:bg-error-light'
                  : 'text-ink-subtle/40 cursor-not-allowed'
              }`}
            >
              <Trash2 size={10} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
