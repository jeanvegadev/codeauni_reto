import type {
  EquipmentDetailResponse,
  EquipmentInput,
  EquipmentListResponse,
  EquipmentResponse,
  EquipmentTypeListResponse,
  EquipmentUpdateInput,
  HealthResponse,
  MaintenanceInput,
  MaintenanceListResponse,
  MaintenanceResponse,
} from "../types";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code = "UNKNOWN_ERROR",
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string>;
  };
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa que la API esté disponible.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & ErrorPayload)
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ??
        `La petición falló con estado ${response.status}.`,
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return payload as T;
}

export const api = {
  listEquipments() {
    return request<EquipmentListResponse>("/api/equipments");
  },

  getEquipment(id: string) {
    return request<EquipmentDetailResponse>(`/api/equipments/${id}`);
  },

  createEquipment(input: EquipmentInput) {
    return request<EquipmentResponse>("/api/equipments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateEquipment(id: string, input: EquipmentUpdateInput) {
    return request<EquipmentResponse>(`/api/equipments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteEquipment(id: string) {
    return request<void>(`/api/equipments/${id}`, { method: "DELETE" });
  },

  listMaintenances(id: string) {
    return request<MaintenanceListResponse>(
      `/api/equipments/${id}/maintenances`,
    );
  },

  createMaintenance(id: string, input: MaintenanceInput) {
    return request<MaintenanceResponse>(
      `/api/equipments/${id}/maintenances`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  equipmentTypes() {
    return request<EquipmentTypeListResponse>("/api/equipment-types");
  },

  health() {
    return request<HealthResponse>("/health");
  },
};
