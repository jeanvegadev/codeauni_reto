import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ApiError, api } from "../lib/api";
import type {
  Equipment,
  EquipmentType,
  EquipmentTypeInfo,
} from "../types";
import { Modal } from "./Modal";

type EquipmentFormModalProps = {
  equipment: Equipment | null;
  types: EquipmentTypeInfo[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20";

export function EquipmentFormModal({
  equipment,
  types,
  onClose,
  onSaved,
}: EquipmentFormModalProps) {
  const isEditing = Boolean(equipment);
  const [code, setCode] = useState(equipment?.code ?? "");
  const [type, setType] = useState<EquipmentType>(equipment?.type ?? "TRUCK");
  const [hours, setHours] = useState(
    equipment ? String(equipment.currentHours) : "0",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedType = types.find((item) => item.type === type);
  const intervalHours = selectedType?.intervalHours ?? 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const nextErrors: Record<string, string> = {};
    const normalizedCode = code.trim().toUpperCase();
    const numericHours = Number(hours.replace(",", "."));

    if (!/^[A-Z0-9-]{2,20}$/.test(normalizedCode)) {
      nextErrors.code =
        "Usa entre 2 y 20 caracteres: letras, números y guiones.";
    }

    if (hours.trim() === "" || !Number.isFinite(numericHours)) {
      nextErrors.currentHours = "Ingresa un horómetro válido.";
    } else if (numericHours < 0) {
      nextErrors.currentHours = "El horómetro no puede ser negativo.";
    } else if (numericHours > 1_000_000) {
      nextErrors.currentHours = "El horómetro supera el máximo permitido.";
    } else if (
      equipment &&
      numericHours < equipment.lastMaintenanceHours
    ) {
      nextErrors.currentHours = `No puede ser menor a ${equipment.lastMaintenanceHours} h (último mantenimiento).`;
    } else if (equipment && numericHours < equipment.currentHours) {
      nextErrors.currentHours = "El horómetro no puede retroceder.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      if (equipment) {
        await api.updateEquipment(equipment.id, {
          code: normalizedCode,
          type,
          currentHours: numericHours,
        });
        onSaved(`Equipo ${normalizedCode} actualizado.`);
      } else {
        await api.createEquipment({
          code: normalizedCode,
          type,
          currentHours: numericHours,
        });
        onSaved(`Equipo ${normalizedCode} registrado.`);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        if (error.details) {
          setFieldErrors(error.details);
        }
      } else {
        setServerError("No se pudo guardar el equipo. Intenta nuevamente.");
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEditing ? "Editar equipo" : "Nuevo equipo"}
      description={
        isEditing
          ? "Actualiza la identificación, el tipo o el horómetro."
          : "Registra un equipo para empezar a controlar su ciclo de mantenimiento."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError ? (
          <div
            role="alert"
            className="flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-200">
              Código del equipo
            </span>
            <input
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="CAM-001"
              maxLength={20}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.code)}
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs text-slate-500">
              Se guarda en mayúsculas. Ejemplo: CAM-001, EXC-014, PER-003.
            </span>
            {fieldErrors.code ? (
              <span className="mt-1 block text-xs text-red-300">
                {fieldErrors.code}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-200">
              Tipo
            </span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as EquipmentType)
              }
              className={inputClass}
            >
              {types.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-slate-500">
              Mantenimiento cada {intervalHours} h.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-200">
              Horómetro actual (horas)
            </span>
            <input
              type="number"
              min={0}
              max={1_000_000}
              step="0.1"
              inputMode="decimal"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              aria-invalid={Boolean(fieldErrors.currentHours)}
              className={inputClass}
            />
            {fieldErrors.currentHours ? (
              <span className="mt-1 block text-xs text-red-300">
                {fieldErrors.currentHours}
              </span>
            ) : (
              <span className="mt-1.5 block text-xs text-slate-500">
                Horas acumuladas de uso del equipo.
              </span>
            )}
          </label>
        </div>

        {isEditing && equipment ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
            Último mantenimiento a las{" "}
            <span className="font-semibold text-slate-200">
              {equipment.lastMaintenanceHours} h
            </span>
            . El horómetro no puede retroceder.
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Registrar equipo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
