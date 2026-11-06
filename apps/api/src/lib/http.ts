import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "El cuerpo de la petición debe ser JSON válido.",
    );
  }
}

function validationDetails(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "body";
    details[field] = issue.message;
  }

  return details;
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Revisa los datos enviados.",
      validationDetails(error),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError(
        409,
        "CODE_ALREADY_EXISTS",
        "Ya existe un equipo con ese código.",
        { code: "El código debe ser único." },
      );
    }

    if (error.code === "P2025") {
      return jsonError(404, "NOT_FOUND", "El equipo no existe.");
    }
  }

  console.error("[api] Error no controlado:", error);

  return jsonError(
    500,
    "INTERNAL_ERROR",
    "Ocurrió un error interno. Intenta nuevamente.",
  );
}
