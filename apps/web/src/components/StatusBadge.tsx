import { AlertTriangle, CheckCircle2 } from "lucide-react";

type StatusBadgeProps = {
  requiresMaintenance: boolean;
};

export function StatusBadge({ requiresMaintenance }: StatusBadgeProps) {
  if (requiresMaintenance) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-300">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Requiere mantenimiento
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Operativo
    </span>
  );
}
