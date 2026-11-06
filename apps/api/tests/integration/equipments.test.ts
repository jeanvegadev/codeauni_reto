import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  GET as getEquipments,
  POST as createEquipmentRoute,
} from "../../app/api/equipments/route";
import {
  DELETE as deleteEquipmentRoute,
  GET as getEquipmentRoute,
  PATCH as updateEquipmentRoute,
} from "../../app/api/equipments/[id]/route";
import {
  GET as getMaintenancesRoute,
  POST as createMaintenanceRoute,
} from "../../app/api/equipments/[id]/maintenances/route";
import { prisma } from "../../src/lib/prisma";

type JsonBody = Record<string, unknown>;

function jsonRequest(
  url: string,
  method: string,
  body?: JsonBody,
): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createEquipment(payload: JsonBody) {
  const response = await createEquipmentRoute(
    jsonRequest("http://localhost/api/equipments", "POST", payload),
  );
  const body = (await response.json()) as { data: { id: string; code: string } };

  return { response, body };
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(async () => {
  await prisma.maintenance.deleteMany();
  await prisma.equipment.deleteMany();
});

afterAll(async () => {
  await prisma.maintenance.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.$disconnect();
});

describe("equipment API integration", () => {
  it("creates, lists, updates and deletes an equipment", async () => {
    const created = await createEquipment({
      code: "cam-100",
      type: "TRUCK",
      currentHours: 120,
    });

    expect(created.response.status).toBe(201);
    expect(created.body.data.code).toBe("CAM-100");

    const listResponse = await getEquipments(
      new Request("http://localhost/api/equipments"),
    );
    const list = (await listResponse.json()) as {
      data: Array<{ code: string; requiresMaintenance: boolean }>;
    };

    expect(list.data).toHaveLength(1);
    expect(list.data[0].requiresMaintenance).toBe(false);

    const updateResponse = await updateEquipmentRoute(
      jsonRequest(
        `http://localhost/api/equipments/${created.body.data.id}`,
        "PATCH",
        { currentHours: 300 },
      ),
      context(created.body.data.id),
    );
    const updated = (await updateResponse.json()) as {
      data: { currentHours: number; requiresMaintenance: boolean };
    };

    expect(updateResponse.status).toBe(200);
    expect(updated.data.currentHours).toBe(300);
    expect(updated.data.requiresMaintenance).toBe(true);

    const deleteResponse = await deleteEquipmentRoute(
      new Request(
        `http://localhost/api/equipments/${created.body.data.id}`,
        { method: "DELETE" },
      ),
      context(created.body.data.id),
    );

    expect(deleteResponse.status).toBe(204);

    const notFoundResponse = await getEquipmentRoute(
      new Request(
        `http://localhost/api/equipments/${created.body.data.id}`,
      ),
      context(created.body.data.id),
    );

    expect(notFoundResponse.status).toBe(404);
  });

  it("supports filters and rejects duplicate codes", async () => {
    await createEquipment({
      code: "EXC-001",
      type: "EXCAVATOR",
      currentHours: 600,
    });

    const duplicate = await createEquipment({
      code: "exc-001",
      type: "DRILL",
      currentHours: 0,
    });

    expect(duplicate.response.status).toBe(409);

    const dueResponse = await getEquipments(
      new Request("http://localhost/api/equipments?status=due"),
    );
    const due = (await dueResponse.json()) as {
      data: Array<{ code: string }>;
    };

    expect(due.data.map((item) => item.code)).toEqual(["EXC-001"]);

    const searchResponse = await getEquipments(
      new Request("http://localhost/api/equipments?search=exc"),
    );
    const search = (await searchResponse.json()) as {
      data: Array<{ code: string }>;
    };

    expect(search.data).toHaveLength(1);
  });

  it("registers maintenance, resets the cycle and stores history", async () => {
    const created = await createEquipment({
      code: "PER-001",
      type: "DRILL",
      currentHours: 210,
    });
    const id = created.body.data.id;

    const maintenanceResponse = await createMaintenanceRoute(
      jsonRequest(
        `http://localhost/api/equipments/${id}/maintenances`,
        "POST",
        { hoursAtService: 215, notes: "Cambio de broca" },
      ),
      context(id),
    );
    const maintenanceBody = (await maintenanceResponse.json()) as {
      data: {
        maintenance: { hoursAtService: number; notes: string };
        equipment: {
          currentHours: number;
          requiresMaintenance: boolean;
          nextMaintenanceHours: number;
          maintenancesCount: number;
        };
      };
    };

    expect(maintenanceResponse.status).toBe(201);
    expect(maintenanceBody.data.maintenance.hoursAtService).toBe(215);
    expect(maintenanceBody.data.maintenance.notes).toBe("Cambio de broca");
    expect(maintenanceBody.data.equipment.currentHours).toBe(215);
    expect(maintenanceBody.data.equipment.requiresMaintenance).toBe(false);
    expect(maintenanceBody.data.equipment.nextMaintenanceHours).toBe(415);
    expect(maintenanceBody.data.equipment.maintenancesCount).toBe(1);

    const historyResponse = await getMaintenancesRoute(
      new Request(`http://localhost/api/equipments/${id}/maintenances`),
      context(id),
    );
    const history = (await historyResponse.json()) as {
      data: Array<{ hoursAtService: number }>;
    };

    expect(history.data).toHaveLength(1);
    expect(history.data[0].hoursAtService).toBe(215);
  });

  it("does not allow the horometer to go backwards", async () => {
    const created = await createEquipment({
      code: "CAM-200",
      type: "TRUCK",
      currentHours: 500,
    });

    const response = await updateEquipmentRoute(
      jsonRequest(
        `http://localhost/api/equipments/${created.body.data.id}`,
        "PATCH",
        { currentHours: 400 },
      ),
      context(created.body.data.id),
    );

    expect(response.status).toBe(400);
  });
});
