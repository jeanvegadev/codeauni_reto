import { describe, expect, it } from "vitest";

import {
  EQUIPMENT_TYPE_CONFIG,
  getMaintenanceStatus,
} from "../../src/lib/maintenance";

describe("getMaintenanceStatus", () => {
  it("uses the interval configured for each equipment type", () => {
    expect(EQUIPMENT_TYPE_CONFIG.TRUCK.intervalHours).toBe(250);
    expect(EQUIPMENT_TYPE_CONFIG.EXCAVATOR.intervalHours).toBe(500);
    expect(EQUIPMENT_TYPE_CONFIG.DRILL.intervalHours).toBe(200);
  });

  it("does not require maintenance before reaching the interval", () => {
    const status = getMaintenanceStatus("TRUCK", 100, 0);

    expect(status.requiresMaintenance).toBe(false);
    expect(status.nextMaintenanceHours).toBe(250);
    expect(status.hoursRemaining).toBe(150);
    expect(status.maintenanceProgress).toBe(40);
  });

  it("requires maintenance exactly at the interval boundary", () => {
    const status = getMaintenanceStatus("DRILL", 200, 0);

    expect(status.requiresMaintenance).toBe(true);
    expect(status.hoursRemaining).toBe(0);
    expect(status.maintenanceProgress).toBe(100);
  });

  it("calculates overdue hours after a new cycle starts", () => {
    const status = getMaintenanceStatus("EXCAVATOR", 640, 100);

    expect(status.nextMaintenanceHours).toBe(600);
    expect(status.hoursRemaining).toBe(0);
    expect(status.overdueHours).toBe(40);
    expect(status.maintenanceProgress).toBe(100);
  });

  it("resets the cycle when the last service matches the current hours", () => {
    const status = getMaintenanceStatus("TRUCK", 300, 300);

    expect(status.requiresMaintenance).toBe(false);
    expect(status.nextMaintenanceHours).toBe(550);
    expect(status.hoursRemaining).toBe(250);
    expect(status.maintenanceProgress).toBe(0);
  });

  it("rounds floating point values to two decimals", () => {
    const status = getMaintenanceStatus("DRILL", 100.126, 0);

    expect(status.hoursRemaining).toBe(99.87);
    expect(status.maintenanceProgress).toBe(50.06);
  });
});
