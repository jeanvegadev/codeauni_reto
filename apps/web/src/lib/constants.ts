import type { EquipmentType, EquipmentTypeInfo } from "../types";

export const FALLBACK_EQUIPMENT_TYPES: EquipmentTypeInfo[] = [
  { type: "TRUCK", label: "Camión", intervalHours: 250 },
  { type: "EXCAVATOR", label: "Excavadora", intervalHours: 500 },
  { type: "DRILL", label: "Perforadora", intervalHours: 200 },
];

export const TYPE_LABELS: Record<EquipmentType, string> = {
  TRUCK: "Camión",
  EXCAVATOR: "Excavadora",
  DRILL: "Perforadora",
};

export const EMPTY_STATE_COPY = {
  title: "Todavía no hay equipos registrados",
  description:
    "Agrega tu primer equipo para empezar a controlar el horómetro y los mantenimientos.",
};
