import {
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  Pickaxe,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DeleteDialog } from "./components/DeleteDialog";
import { EquipmentFormModal } from "./components/EquipmentFormModal";
import { EquipmentTable } from "./components/EquipmentTable";
import { HistoryModal } from "./components/HistoryModal";
import { MaintenanceModal } from "./components/MaintenanceModal";
import { StatCard } from "./components/StatCard";
import { Toast, type ToastKind } from "./components/Toast";
import { API_BASE_URL, api } from "./lib/api";
import {
  EMPTY_STATE_COPY,
  FALLBACK_EQUIPMENT_TYPES,
} from "./lib/constants";
import { formatHours } from "./lib/format";
import type { Equipment, EquipmentTypeInfo } from "./types";

type ApiStatus = "checking" | "online" | "offline";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; equipment: Equipment }
  | { kind: "maintenance"; equipment: Equipment }
  | { kind: "history"; equipment: Equipment }
  | { kind: "delete"; equipment: Equipment }
  | null;

type ToastState = {
  id: number;
  kind: ToastKind;
  message: string;
};

type StatusFilter = "all" | "due" | "ok";

const selectClass =
  "rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20";

const statusPill: Record<ApiStatus, { label: string; className: string }> = {
  checking: {
    label: "Verificando API",
    className: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  },
  online: {
    label: "API operativa",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
  offline: {
    label: "API sin conexión",
    className: "border-red-400/25 bg-red-400/10 text-red-200",
  },
};

export default function App() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentTypeInfo[]>(
    FALLBACK_EQUIPMENT_TYPES,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Equipment["type"]>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const checkHealth = useCallback(async () => {
    setApiStatus("checking");

    try {
      const health = await api.health();
      setApiStatus(
        health.status === "ok" && health.database === "up"
          ? "online"
          : "offline",
      );
    } catch {
      setApiStatus("offline");
    }
  }, []);

  const loadEquipments = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const response = await api.listEquipments();
      setEquipments(response.data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la lista de equipos.",
      );
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadEquipments(true);
    void checkHealth();
  }, [loadEquipments, checkHealth]);

  useEffect(() => {
    let active = true;

    api
      .equipmentTypes()
      .then((response) => {
        if (active && response.data.length > 0) {
          setTypes(response.data);
        }
      })
      .catch(() => {
        // Se mantienen los valores por defecto si el endpoint falla.
      });

    return () => {
      active = false;
    };
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  const handleSaved = useCallback(
    (message: string) => {
      setModal(null);
      showToast(message, "success");
      void loadEquipments(false);
      void checkHealth();
    },
    [checkHealth, loadEquipments, showToast],
  );

  const handleRefresh = useCallback(() => {
    void loadEquipments(true);
    void checkHealth();
  }, [checkHealth, loadEquipments]);

  const stats = useMemo(() => {
    const due = equipments.filter((item) => item.requiresMaintenance).length;
    const totalHours = equipments.reduce(
      (sum, item) => sum + item.currentHours,
      0,
    );

    return {
      total: equipments.length,
      due,
      operational: equipments.length - due,
      totalHours,
    };
  }, [equipments]);

  const filteredEquipments = useMemo(() => {
    const query = search.trim().toUpperCase();

    return equipments.filter((equipment) => {
      const matchesSearch =
        query.length === 0 || equipment.code.toUpperCase().includes(query);
      const matchesType =
        typeFilter === "all" || equipment.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "due" && equipment.requiresMaintenance) ||
        (statusFilter === "ok" && !equipment.requiresMaintenance);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [equipments, search, statusFilter, typeFilter]);

  const hasFilters =
    search.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  const activePill = statusPill[apiStatus];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20">
              <Pickaxe className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                MinerTrack
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Control de equipos mineros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${API_BASE_URL}/health`}
              target="_blank"
              rel="noreferrer"
              title="Ver estado de la API"
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:brightness-110 sm:inline-flex ${activePill.className}`}
            >
              <span className="relative flex size-2">
                {apiStatus === "checking" ? (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                ) : null}
                <span className="relative inline-flex size-2 rounded-full bg-current" />
              </span>
              {activePill.label}
            </a>

            <button
              type="button"
              onClick={handleRefresh}
              title="Actualizar datos"
              aria-label="Actualizar datos"
              className="grid size-10 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => setModal({ kind: "create" })}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo equipo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">
              Operaciones mineras
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Registro de equipos
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              Controla el horómetro de camiones, excavadoras y perforadoras.
              Cuando un equipo alcanza su intervalo, se marca automáticamente
              como <span className="text-slate-200">requiere mantenimiento</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModal({ kind: "create" })}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 md:self-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            Registrar equipo
          </button>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Equipos"
            value={String(stats.total)}
            helper="En el registro"
            accent="sky"
            icon={<Truck className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="Requieren servicio"
            value={String(stats.due)}
            helper="Alcanzaron su intervalo"
            accent="red"
            icon={<Wrench className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="Operativos"
            value={String(stats.operational)}
            helper="Dentro del ciclo"
            accent="emerald"
            icon={<Activity className="size-5" aria-hidden="true" />}
          />
          <StatCard
            label="Horas registradas"
            value={formatHours(stats.totalHours)}
            helper="Suma de horómetros"
            accent="amber"
            icon={<Gauge className="size-5" aria-hidden="true" />}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/45 p-3 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código..."
                aria-label="Buscar equipos por código"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as "all" | Equipment["type"],
                  )
                }
                aria-label="Filtrar por tipo"
                className={selectClass}
              >
                <option value="all">Todos los tipos</option>
                {types.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                aria-label="Filtrar por estado"
                className={selectClass}
              >
                <option value="all">Todos los estados</option>
                <option value="due">Requiere mantenimiento</option>
                <option value="ok">Operativos</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] px-1 pt-3">
            <p className="text-xs text-slate-500">
              Mostrando{" "}
              <span className="font-medium text-slate-300">
                {filteredEquipments.length}
              </span>{" "}
              de {equipments.length} equipos
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-amber-300 transition hover:text-amber-200"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </section>

        <section className="mt-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-900/50"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-400/25 bg-red-400/[0.07] p-8 text-center">
              <AlertTriangle
                className="mx-auto size-8 text-red-300"
                aria-hidden="true"
              />
              <p className="mt-3 font-semibold text-red-100">
                No se pudo cargar el registro
              </p>
              <p className="mt-1 text-sm text-red-200/80">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadEquipments(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-400/20"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : filteredEquipments.length > 0 ? (
            <EquipmentTable
              equipments={filteredEquipments}
              onEdit={(equipment) => setModal({ kind: "edit", equipment })}
              onMaintenance={(equipment) =>
                setModal({ kind: "maintenance", equipment })
              }
              onHistory={(equipment) =>
                setModal({ kind: "history", equipment })
              }
              onDelete={(equipment) =>
                setModal({ kind: "delete", equipment })
              }
            />
          ) : equipments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/30 px-6 py-14 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <Pickaxe className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-white">
                {EMPTY_STATE_COPY.title}
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
                {EMPTY_STATE_COPY.description}
              </p>
              <button
                type="button"
                onClick={() => setModal({ kind: "create" })}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                <Plus className="size-4" aria-hidden="true" />
                Registrar primer equipo
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/30 px-6 py-12 text-center">
              <Search
                className="mx-auto size-7 text-slate-600"
                aria-hidden="true"
              />
              <p className="mt-3 font-semibold text-slate-200">
                No hay equipos que coincidan con los filtros
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prueba con otro código, tipo o estado.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-medium text-amber-300 transition hover:text-amber-200"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            MinerTrack · Datos en PostgreSQL · Frontend y backend desplegados en
            Vercel
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`${API_BASE_URL}/health`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-slate-300"
            >
              <Database className="size-3.5" aria-hidden="true" />
              Estado del backend
            </a>
            <a
              href={API_BASE_URL}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-slate-300"
            >
              API: {API_BASE_URL.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </footer>
      </main>

      {modal?.kind === "create" || modal?.kind === "edit" ? (
        <EquipmentFormModal
          equipment={modal.kind === "edit" ? modal.equipment : null}
          types={types}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {modal?.kind === "maintenance" ? (
        <MaintenanceModal
          equipment={modal.equipment}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {modal?.kind === "history" ? (
        <HistoryModal
          equipment={modal.equipment}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.kind === "delete" ? (
        <DeleteDialog
          equipment={modal.equipment}
          onClose={() => setModal(null)}
          onDeleted={handleSaved}
        />
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          kind={toast.kind}
          onClose={closeToast}
        />
      ) : null}
    </div>
  );
}
