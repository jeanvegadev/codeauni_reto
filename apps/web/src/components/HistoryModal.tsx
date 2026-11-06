import { AlertTriangle, Loader2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatDateTime, formatHours, typeLabel } from "../lib/format";
import type { Equipment, Maintenance } from "../types";
import { Modal } from "./Modal";

type HistoryModalProps = {
  equipment: Equipment;
  onClose: () => void;
};

export function HistoryModal({ equipment, onClose }: HistoryModalProps) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api
      .listMaintenances(equipment.id)
      .then((response) => {
        if (active) {
          setMaintenances(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar el historial de mantenimiento.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [equipment.id]);

  return (
    <Modal
      title="Historial de mantenimiento"
      description={`${equipment.code} · ${typeLabel(equipment.type)}`}
      onClose={onClose}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando historial...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : maintenances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-12 text-center">
          <Wrench className="mx-auto size-8 text-slate-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-300">
            Sin mantenimientos registrados
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Registra un servicio para iniciar el historial de este equipo.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-xs uppercase tracking-wider text-slate-500">
            {maintenances.length}{" "}
            {maintenances.length === 1
              ? "mantenimiento registrado"
              : "mantenimientos registrados"}
          </p>
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {maintenances.map((maintenance) => (
              <li key={maintenance.id} className="relative">
                <span className="absolute -left-[1.65rem] top-0.5 grid size-6 place-items-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  <Wrench className="size-3" aria-hidden="true" />
                </span>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      Servicio a las{" "}
                      {formatHours(maintenance.hoursAtService)}
                    </p>
                    <time
                      dateTime={maintenance.performedAt}
                      className="text-xs text-slate-500"
                    >
                      {formatDateTime(maintenance.performedAt)}
                    </time>
                  </div>
                  {maintenance.notes ? (
                    <p className="mt-2 text-sm text-slate-300">
                      {maintenance.notes}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs italic text-slate-500">
                      Sin notas.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}
