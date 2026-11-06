import type { Equipment } from "@prisma/client";

import { getMaintenanceStatus } from "./maintenance";

type EquipmentWithCount = Equipment & {
  _count?: { maintenances: number };
};

export function serializeEquipment(equipment: EquipmentWithCount) {
  const status = getMaintenanceStatus(
    equipment.type,
    equipment.currentHours,
    equipment.lastMaintenanceHours,
  );

  return {
    id: equipment.id,
    code: equipment.code,
    type: equipment.type,
    currentHours: equipment.currentHours,
    lastMaintenanceHours: equipment.lastMaintenanceHours,
    lastMaintenanceAt: equipment.lastMaintenanceAt,
    createdAt: equipment.createdAt,
    updatedAt: equipment.updatedAt,
    maintenancesCount: equipment._count?.maintenances ?? 0,
    ...status,
  };
}
