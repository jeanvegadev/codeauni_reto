import {
  Construction,
  Gauge,
  History,
  Pencil,
  Pickaxe,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  formatDate,
  formatHours,
  progressTone,
  typeLabel,
} from "../lib/format";
import type { Equipment, EquipmentType } from "../types";
import { StatusBadge } from "./StatusBadge";

type EquipmentTableProps = {
  equipments: Equipment[];
  onEdit: (equipment: Equipment) => void;
  onMaintenance: (equipment: Equipment) => void;
  onHistory: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
};

const typeIconClasses: Record<EquipmentType, string> = {
  TRUCK: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  EXCAVATOR: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  DRILL: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300",
};

const progressClasses = {
  ok: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
};

function TypeIcon({ type }: { type: EquipmentType }) {
  const Icon =
    type === "TRUCK" ? Truck : type === "EXCAVATOR" ? Construction : Pickaxe;

  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-xl border ${typeIconClasses[type]}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

function ProgressBar({ equipment }: { equipment: Equipment }) {
  const tone = progressTone(
    equipment.maintenanceProgress,
    equipment.requiresMaintenance,
  );

  return (
    <div className="mt-1.5 h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${progressClasses[tone]}`}
        style={{ width: `${Math.min(100, equipment.maintenanceProgress)}%` }}
      />
    </div>
  );
}

type IconButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "amber" | "danger";
};

function IconButton({
  label,
  onClick,
  children,
  tone = "default",
}: IconButtonProps) {
  const toneClasses = {
    default:
      "border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:text-white",
    amber:
      "border-amber-400/25 bg-amber-400/10 text-amber-300 hover:border-amber-400/40 hover:bg-amber-400/20",
    danger:
      "border-transparent text-slate-500 hover:border-red-400/25 hover:bg-red-400/10 hover:text-red-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid size-8 place-items-center rounded-lg border transition ${toneClasses[tone]}`}
    >
      {children}
    </button>
  );
}

function RowActions({
  equipment,
  onEdit,
  onMaintenance,
  onHistory,
  onDelete,
  showMaintenance = true,
}: EquipmentTableProps & {
  equipment: Equipment;
  showMaintenance?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {showMaintenance ? (
        <IconButton
          label={`Registrar mantenimiento de ${equipment.code}`}
          onClick={() => onMaintenance(equipment)}
          tone="amber"
        >
          <Wrench className="size-4" />
        </IconButton>
      ) : null}
      <IconButton
        label={`Ver historial de ${equipment.code}`}
        onClick={() => onHistory(equipment)}
      >
        <History className="size-4" />
      </IconButton>
      <IconButton
        label={`Editar ${equipment.code}`}
        onClick={() => onEdit(equipment)}
      >
        <Pencil className="size-4" />
      </IconButton>
      <IconButton
        label={`Eliminar ${equipment.code}`}
        onClick={() => onDelete(equipment)}
        tone="danger"
      >
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  );
}

export function EquipmentTable(props: EquipmentTableProps) {
  const { equipments } = props;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/55 shadow-xl shadow-slate-950/25 backdrop-blur">
      <div className="hidden lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Equipo
              </th>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Horómetro
              </th>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Próximo servicio
              </th>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Último servicio
              </th>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Estado
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {equipments.map((equipment) => (
              <tr
                key={equipment.id}
                className="transition-colors hover:bg-white/[0.025]"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <TypeIcon type={equipment.type} />
                    <div>
                      <p className="font-semibold text-white">
                        {equipment.code}
                      </p>
                      <p className="text-xs text-slate-500">
                        {typeLabel(equipment.type)} ·{" "}
                        {equipment.maintenancesCount}{" "}
                        {equipment.maintenancesCount === 1
                          ? "servicio"
                          : "servicios"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Gauge className="size-3.5 text-slate-500" aria-hidden="true" />
                    {formatHours(equipment.currentHours)}
                  </div>
                  <ProgressBar equipment={equipment} />
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-200">
                    {formatHours(equipment.nextMaintenanceHours)}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      equipment.requiresMaintenance
                        ? "text-red-300"
                        : "text-slate-500"
                    }`}
                  >
                    {equipment.requiresMaintenance
                      ? `${formatHours(equipment.overdueHours)} vencidas`
                      : `${formatHours(equipment.hoursRemaining)} restantes`}
                  </p>
                </td>
                <td className="px-5 py-4 text-slate-300">
                  {formatDate(equipment.lastMaintenanceAt)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge
                    requiresMaintenance={equipment.requiresMaintenance}
                  />
                </td>
                <td className="px-5 py-4">
                  <RowActions {...props} equipment={equipment} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-white/[0.06] lg:hidden">
        {equipments.map((equipment) => (
          <article key={equipment.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <TypeIcon type={equipment.type} />
                <div>
                  <p className="font-semibold text-white">{equipment.code}</p>
                  <p className="text-xs text-slate-500">
                    {typeLabel(equipment.type)} ·{" "}
                    {equipment.maintenancesCount}{" "}
                    {equipment.maintenancesCount === 1
                      ? "servicio"
                      : "servicios"}
                  </p>
                </div>
              </div>
              <StatusBadge
                requiresMaintenance={equipment.requiresMaintenance}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Horómetro
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-200">
                  {formatHours(equipment.currentHours)}
                </p>
                <ProgressBar equipment={equipment} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Próximo servicio
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-200">
                  {formatHours(equipment.nextMaintenanceHours)}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    equipment.requiresMaintenance
                      ? "text-red-300"
                      : "text-slate-500"
                  }`}
                >
                  {equipment.requiresMaintenance
                    ? `${formatHours(equipment.overdueHours)} vencidas`
                    : `${formatHours(equipment.hoursRemaining)} restantes`}
                </p>
              </div>
              <div className="col-span-2 border-t border-white/5 pt-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Último servicio
                </p>
                <p className="mt-0.5 text-sm text-slate-300">
                  {formatDate(equipment.lastMaintenanceAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => props.onMaintenance(equipment)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/20"
              >
                <Wrench className="size-3.5" aria-hidden="true" />
                Mantenimiento
              </button>
              <RowActions
                {...props}
                equipment={equipment}
                showMaintenance={false}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
