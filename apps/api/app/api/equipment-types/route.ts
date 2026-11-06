import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_CONFIG,
} from "../../../src/lib/maintenance";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      data: EQUIPMENT_TYPES.map((type) => EQUIPMENT_TYPE_CONFIG[type]),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
