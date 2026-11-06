import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the maintenance warning when the interval is reached", () => {
    render(<StatusBadge requiresMaintenance />);

    expect(screen.getByText("Requiere mantenimiento")).toBeInTheDocument();
  });

  it("shows the operational state inside the cycle", () => {
    render(<StatusBadge requiresMaintenance={false} />);

    expect(screen.getByText("Operativo")).toBeInTheDocument();
  });
});
