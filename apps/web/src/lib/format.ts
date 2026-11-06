const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatHours(value: number): string {
  return `${numberFormatter.format(value)} h`;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Sin registros";
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Sin registros";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function progressTone(
  progress: number,
  requiresMaintenance: boolean,
): "ok" | "warning" | "danger" {
  if (requiresMaintenance) {
    return "danger";
  }

  if (progress >= 80) {
    return "warning";
  }

  return "ok";
}

export function typeLabel(type: string): string {
  if (type === "TRUCK") return "Camión";
  if (type === "EXCAVATOR") return "Excavadora";
  if (type === "DRILL") return "Perforadora";
  return type;
}
