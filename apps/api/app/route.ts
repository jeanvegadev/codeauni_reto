export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "mining-equipment-api",
    status: "ok",
    endpoints: {
      health: "/health",
      equipments: "/api/equipments",
      equipmentTypes: "/api/equipment-types",
    },
  });
}
