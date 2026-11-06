import type { Prisma } from "@prisma/client";

import {
  ApiError,
  handleRouteError,
  jsonError,
  parseJsonBody,
} from "../../../../../src/lib/http";
import { prisma } from "../../../../../src/lib/prisma";
import { serializeEquipment } from "../../../../../src/lib/serializers";
import { createMaintenanceSchema } from "../../../../../src/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const withCount = {
  _count: { select: { maintenances: true } },
} satisfies Prisma.EquipmentInclude;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!equipment) {
      return jsonError(404, "NOT_FOUND", "El equipo no existe.");
    }

    const maintenances = await prisma.maintenance.findMany({
      where: { equipmentId: id },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    });

    return Response.json(
      { data: maintenances, meta: { total: maintenances.length } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const input = createMaintenanceSchema.parse(body);

    const current = await prisma.equipment.findUnique({ where: { id } });

    if (!current) {
      return jsonError(404, "NOT_FOUND", "El equipo no existe.");
    }

    const hoursAtService = input.hoursAtService ?? current.currentHours;

    if (hoursAtService < current.currentHours) {
      throw new ApiError(
        400,
        "HOURS_CANNOT_DECREASE",
        "Las horas del mantenimiento no pueden ser menores al horómetro actual.",
        { hoursAtService: `Debe ser mayor o igual a ${current.currentHours}.` },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenance.create({
        data: {
          equipmentId: id,
          hoursAtService,
          notes: input.notes && input.notes.length > 0 ? input.notes : null,
        },
      });

      const equipment = await tx.equipment.update({
        where: { id },
        data: {
          currentHours: hoursAtService,
          lastMaintenanceHours: hoursAtService,
          lastMaintenanceAt: maintenance.performedAt,
        },
        include: withCount,
      });

      return { maintenance, equipment };
    });

    return Response.json(
      {
        data: {
          maintenance: result.maintenance,
          equipment: serializeEquipment(result.equipment),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
