import { AlertTriangle, Loader2, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ApiError, api } from "../lib/api";
import { formatDate, formatHours, typeLabel } from "../lib/format";
import type { Equipment } from "../types";
import { Modal } from "./Modal";

type MaintenanceModalProps = {
  equipment: Equipment;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20";

export function MaintenanceModal({
  equipment,
  onClose,
  onSaved,
}: MaintenanceModalProps) {
  const [hours, setHours] = useState(String(equipment.currentHours));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const numericHours = Number(hours.replace(",", "."));
  const nextService = Number.isFinite(numericHours)
    ? numericHours + equipment.maintenanceIntervalHours
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (hours.trim() === "" || !Number.isFinite(numericHours)) {
      setError("Ingresa un horómetro válido.");
      return;
    }

    if (numericHours < equipment.currentHours) {
      setError(
        `Las horas del servicio no pueden ser menores al horómetro actual (${equipment.currentHours} h).`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await api.createMaintenance(equipment.id, {
        hoursAtService: numericHours,
        notes: notes.trim() || undefined,
      });
      onSaved(
        `Mantenimiento registrado para ${equipment.code}. El ciclo se reinició.`,
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo registrar el mantenimiento.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Registrar mantenimiento"
      description={`${equipment.code} · ${typeLabel(equipment.type)}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Horómetro actual</p>
            <p className="mt-1 font-semibold text-white">
              {formatHours(equipment.currentHours)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Último servicio</p>
            <p className="mt-1 font-semibold text-white">
              {formatDate(equipment.lastMaintenanceAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Intervalo</p>
            <p className="mt-1 font-semibold text-white">
              {formatHours(equipment.maintenanceIntervalHours)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Estado</p>
            <p
              className={`mt-1 font-semibold ${
                equipment.requiresMaintenance
                  ? "text-red-300"
                  : "text-emerald-300"
              }`}
            >
              {equipment.requiresMaintenance
                ? `${formatHours(equipment.overdueHours)} vencidas`
                : `${formatHours(equipment.hoursRemaining)} restantes`}
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-200">
            Horas al momento del servicio
          </span>
          <input
            type="number"
            min={equipment.currentHours}
            max={1_000_000}
            step="0.1"
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Si el horómetro avanzó, actualízalo aquí. Debe ser mayor o igual a{" "}
            {equipment.currentHours} h.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-200">
            Notas <span className="font-normal text-slate-500">(opcional)</span>
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Cambio de aceite, revisión de frenos, etc."
            className={`${inputClass} resize-none`}
          />
          <span className="mt-1 block text-right text-xs text-slate-600">
            {notes.length}/500
          </span>
        </label>

        {nextService !== null ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-xs text-amber-100/80">
            Al guardar, el próximo mantenimiento será a las{" "}
            <span className="font-semibold text-amber-200">
              {formatHours(nextService)}
            </span>
            . El historial quedará registrado.
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
              <Wrench className="size-4" aria-hidden="true" />
            )}
            {submitting ? "Registrando..." : "Confirmar mantenimiento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
