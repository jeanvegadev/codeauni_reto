export type EquipmentType = "TRUCK" | "EXCAVATOR" | "DRILL";

export type EquipmentTypeInfo = {
  type: EquipmentType;
  label: string;
  intervalHours: number;
};

export type Equipment = {
  id: string;
  code: string;
  type: EquipmentType;
  currentHours: number;
  lastMaintenanceHours: number;
  lastMaintenanceAt: string | null;
  createdAt: string;
  updatedAt: string;
  maintenancesCount: number;
  maintenanceIntervalHours: number;
  nextMaintenanceHours: number;
  hoursRemaining: number;
  overdueHours: number;
  maintenanceProgress: number;
  requiresMaintenance: boolean;
};

export type Maintenance = {
  id: string;
  equipmentId: string;
  hoursAtService: number;
  notes: string | null;
  performedAt: string;
  createdAt: string;
};

export type EquipmentDetail = Equipment & {
  maintenances: Maintenance[];
};

export type EquipmentInput = {
  code: string;
  type: EquipmentType;
  currentHours: number;
};

export type EquipmentUpdateInput = Partial<EquipmentInput>;

export type MaintenanceInput = {
  hoursAtService?: number;
  notes?: string;
};

export type EquipmentTypeListResponse = {
  data: EquipmentTypeInfo[];
};

export type EquipmentListResponse = {
  data: Equipment[];
  meta: { total: number };
};

export type EquipmentResponse = {
  data: Equipment;
};

export type EquipmentDetailResponse = {
  data: EquipmentDetail;
};

export type MaintenanceListResponse = {
  data: Maintenance[];
  meta: { total: number };
};

export type MaintenanceResponse = {
  data: {
    maintenance: Maintenance;
    equipment: Equipment;
  };
};

export type HealthResponse = {
  status: "ok" | "error";
  service: string;
  database: "up" | "down";
  timestamp: string;
  version?: string;
};
