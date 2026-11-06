import { prisma } from "../../src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        service: "mining-equipment-api",
        database: "up",
        timestamp: new Date().toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] La base de datos no responde:", error);

    return Response.json(
      {
        status: "error",
        service: "mining-equipment-api",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
