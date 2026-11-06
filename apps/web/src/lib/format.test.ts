import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatHours,
  progressTone,
  typeLabel,
} from "./format";

describe("formatHours", () => {
  it("formats hours using the Spanish locale", () => {
    expect(formatHours(1250.5)).toBe("1.250,5 h");
  });

  it("formats zero", () => {
    expect(formatHours(0)).toBe("0 h");
  });
});

describe("formatDate", () => {
  it("returns a fallback when there is no date", () => {
    expect(formatDate(null)).toBe("Sin registros");
  });
});

describe("progressTone", () => {
  it("marks equipment as danger when maintenance is required", () => {
    expect(progressTone(100, true)).toBe("danger");
  });

  it("marks equipment as warning near the interval", () => {
    expect(progressTone(85, false)).toBe("warning");
  });

  it("marks equipment as ok early in the cycle", () => {
    expect(progressTone(30, false)).toBe("ok");
  });
});

describe("typeLabel", () => {
  it("translates equipment types", () => {
    expect(typeLabel("TRUCK")).toBe("Camión");
    expect(typeLabel("EXCAVATOR")).toBe("Excavadora");
    expect(typeLabel("DRILL")).toBe("Perforadora");
  });
});
