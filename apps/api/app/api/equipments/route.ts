import type { Prisma } from "@prisma/client";

import { handleRouteError, jsonError, parseJsonBody } from "../../../src/lib/http";
import {
  isEquipmentType,
  type EquipmentType,
} from "../../../src/lib/maintenance";
import { prisma } from "../../../src/lib/prisma";
import { serializeEquipment } from "../../../src/lib/serializers";
import { createEquipmentSchema } from "../../../src/lib/validation";

export const dynamic = "force-dynamic";

const withCount = {
  _count: { select: { maintenances: true } },
} satisfies Prisma.EquipmentInclude;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const typeParam = url.searchParams.get("type")?.trim() ?? "";
    const status = url.searchParams.get("status")?.trim() ?? "";

    if (typeParam && !isEquipmentType(typeParam)) {
      return jsonError(
        400,
        "INVALID_TYPE",
        "El tipo debe ser TRUCK, EXCAVATOR o DRILL.",
      );
    }

    if (status && status !== "due" && status !== "ok") {
      return jsonError(
        400,
        "INVALID_STATUS",
        "El estado debe ser due u ok.",
      );
    }

    const typeFilter: EquipmentType | undefined =
      typeParam && isEquipmentType(typeParam) ? typeParam : undefined;

    const where: Prisma.EquipmentWhereInput = {
      ...(search
        ? { code: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    };

    const equipments = await prisma.equipment.findMany({
      where,
      include: withCount,
      orderBy: { code: "asc" },
    });

    let data = equipments.map(serializeEquipment);

    if (status === "due") {
      data = data.filter((equipment) => equipment.requiresMaintenance);
    }

    if (status === "ok") {
      data = data.filter((equipment) => !equipment.requiresMaintenance);
    }

    return Response.json(
      { data, meta: { total: data.length } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const input = createEquipmentSchema.parse(body);

    const equipment = await prisma.equipment.create({
      data: input,
      include: withCount,
    });

    return Response.json(
      { data: serializeEquipment(equipment) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
