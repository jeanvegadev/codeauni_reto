import { describe, expect, it } from "vitest";

import {
  createEquipmentSchema,
  createMaintenanceSchema,
  updateEquipmentSchema,
} from "../../src/lib/validation";

describe("createEquipmentSchema", () => {
  it("normalizes codes to uppercase", () => {
    const parsed = createEquipmentSchema.parse({
      code: " cam-001 ",
      type: "TRUCK",
      currentHours: 12.5,
    });

    expect(parsed.code).toBe("CAM-001");
  });

  it("rejects invalid codes", () => {
    const result = createEquipmentSchema.safeParse({
      code: "CAM 001!",
      type: "TRUCK",
      currentHours: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown equipment types", () => {
    const result = createEquipmentSchema.safeParse({
      code: "CAM-001",
      type: "BULLDOZER",
      currentHours: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative hours", () => {
    const result = createEquipmentSchema.safeParse({
      code: "CAM-001",
      type: "TRUCK",
      currentHours: -1,
    });

    expect(result.success).toBe(false);
  });
});

describe("updateEquipmentSchema", () => {
  it("requires at least one field", () => {
    expect(updateEquipmentSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial update", () => {
    expect(
      updateEquipmentSchema.safeParse({ currentHours: 300 }).success,
    ).toBe(true);
  });
});

describe("createMaintenanceSchema", () => {
  it("accepts empty notes and optional hours", () => {
    expect(createMaintenanceSchema.safeParse({}).success).toBe(true);
  });

  it("rejects notes longer than 500 characters", () => {
    const result = createMaintenanceSchema.safeParse({
      notes: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });
});
