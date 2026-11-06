import type { Prisma } from "@prisma/client";

import {
  ApiError,
  handleRouteError,
  jsonError,
  parseJsonBody,
} from "../../../../src/lib/http";
import { prisma } from "../../../../src/lib/prisma";
import { serializeEquipment } from "../../../../src/lib/serializers";
import { updateEquipmentSchema } from "../../../../src/lib/validation";

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
      include: {
        ...withCount,
        maintenances: {
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!equipment) {
      return jsonError(404, "NOT_FOUND", "El equipo no existe.");
    }

    return Response.json(
      {
        data: {
          ...serializeEquipment(equipment),
          maintenances: equipment.maintenances,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const input = updateEquipmentSchema.parse(body);

    const current = await prisma.equipment.findUnique({ where: { id } });

    if (!current) {
      return jsonError(404, "NOT_FOUND", "El equipo no existe.");
    }

    if (
      input.currentHours !== undefined &&
      input.currentHours < current.currentHours
    ) {
      throw new ApiError(
        400,
        "HOURS_CANNOT_DECREASE",
        "El horómetro no puede retroceder.",
        { currentHours: `Debe ser mayor o igual a ${current.currentHours}.` },
      );
    }

    if (
      input.currentHours !== undefined &&
      input.currentHours < current.lastMaintenanceHours
    ) {
      throw new ApiError(
        400,
        "HOURS_BEFORE_LAST_MAINTENANCE",
        "El horómetro no puede ser menor que las horas del último mantenimiento.",
        { currentHours: `Debe ser mayor o igual a ${current.lastMaintenanceHours}.` },
      );
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: input,
      include: withCount,
    });

    return Response.json({ data: serializeEquipment(equipment) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.equipment.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
