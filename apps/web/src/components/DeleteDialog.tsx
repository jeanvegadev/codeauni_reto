import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { ApiError, api } from "../lib/api";
import type { Equipment } from "../types";
import { Modal } from "./Modal";

type DeleteDialogProps = {
  equipment: Equipment;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function DeleteDialog({
  equipment,
  onClose,
  onDeleted,
}: DeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setSubmitting(true);

    try {
      await api.deleteEquipment(equipment.id);
      onDeleted(`Equipo ${equipment.code} eliminado.`);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo eliminar el equipo.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Eliminar equipo" onClose={onClose} size="sm">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3.5 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Vas a eliminar <strong>{equipment.code}</strong> y todo su
            historial de mantenimiento. Esta acción no se puede deshacer.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {submitting ? "Eliminando..." : "Eliminar equipo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
