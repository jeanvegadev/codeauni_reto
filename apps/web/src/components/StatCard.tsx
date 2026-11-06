import type { ReactNode } from "react";

type Accent = "amber" | "emerald" | "red" | "sky";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  accent: Accent;
};

const accentClasses: Record<Accent, string> = {
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  red: "border-red-400/20 bg-red-400/10 text-red-300",
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-300",
};

export function StatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-4 shadow-lg shadow-slate-950/20 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl border ${accentClasses[accent]}`}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}
