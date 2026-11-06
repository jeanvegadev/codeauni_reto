import { NextResponse, type NextRequest } from "next/server";

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
];

function allowedOrigins(): string[] {
  const configured = (process.env.WEB_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...LOCAL_ORIGINS, ...configured];
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed = Boolean(origin && allowedOrigins().includes(origin));

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (isAllowed && origin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/health"],
};
