import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Dashboard overview fans out dozens of Prisma queries; the default 15s Pro limit drops the socket as "Failed to fetch". */
export const maxDuration = 60;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function apiOrigin(): string | null {
  const raw = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  if (process.env.NODE_ENV !== "production") {
    if (raw && !/localhost|127\.0\.0\.1/.test(raw)) return raw;
    return "http://127.0.0.1:4000";
  }
  if (!raw || /localhost|127\.0\.0\.1/.test(raw)) return null;
  return raw;
}

async function proxy(req: NextRequest, path: string[]) {
  const origin = apiOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        error: {
          code: "API_UNCONFIGURED",
          message:
            "Set API_BASE_URL on the Vercel frontend project (Settings → Environment Variables, Production) to the API project's .vercel.app origin, then Redeploy. Do not use NEXT_PUBLIC_API_BASE_URL.",
        },
      },
      { status: 503 },
    );
  }

  const url = `${origin}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(55_000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    (init as { duplex?: "half" }).duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not reach the Doloyal API.";
    const timedOut =
      (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) ||
      /timeout|aborted/i.test(message);
    return NextResponse.json(
      {
        error: {
          code: timedOut ? "API_TIMEOUT" : "API_UNREACHABLE",
          message: timedOut
            ? "The Doloyal API took too long to respond. Please try again."
            : message,
        },
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

type Ctx = { params: { path: string[] } };

export function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function HEAD(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function OPTIONS(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
