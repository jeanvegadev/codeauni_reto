export const EQUIPMENT_TYPES = ["TRUCK", "EXCAVATOR", "DRILL"] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export type EquipmentTypeConfig = {
  type: EquipmentType;
  label: string;
  intervalHours: number;
};

export const EQUIPMENT_TYPE_CONFIG: Record<EquipmentType, EquipmentTypeConfig> = {
  TRUCK: { type: "TRUCK", label: "Camión", intervalHours: 250 },
  EXCAVATOR: { type: "EXCAVATOR", label: "Excavadora", intervalHours: 500 },
  DRILL: { type: "DRILL", label: "Perforadora", intervalHours: 200 },
};

export type MaintenanceStatus = {
  maintenanceIntervalHours: number;
  nextMaintenanceHours: number;
  hoursRemaining: number;
  overdueHours: number;
  maintenanceProgress: number;
  requiresMaintenance: boolean;
};

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getMaintenanceStatus(
  type: EquipmentType,
  currentHours: number,
  lastMaintenanceHours: number,
): MaintenanceStatus {
  const { intervalHours } = EQUIPMENT_TYPE_CONFIG[type];
  const nextMaintenanceHours = roundHours(lastMaintenanceHours + intervalHours);
  const hoursRemaining = roundHours(Math.max(0, nextMaintenanceHours - currentHours));
  const overdueHours = roundHours(Math.max(0, currentHours - nextMaintenanceHours));
  const cycleHours = Math.max(0, currentHours - lastMaintenanceHours);
  const maintenanceProgress = Math.min(
    100,
    Math.max(0, roundHours((cycleHours / intervalHours) * 100)),
  );

  return {
    maintenanceIntervalHours: intervalHours,
    nextMaintenanceHours,
    hoursRemaining,
    overdueHours,
    maintenanceProgress,
    requiresMaintenance:
      currentHours + Number.EPSILON >= nextMaintenanceHours,
  };
}

export function isEquipmentType(value: string): value is EquipmentType {
  return (EQUIPMENT_TYPES as readonly string[]).includes(value);
}
