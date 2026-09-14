import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
            "Set API_BASE_URL on Vercel to your deployed Doloyal API URL (e.g. https://your-api.onrender.com), then redeploy.",
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

  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    (init as { duplex?: "half" }).duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not reach the Doloyal API.";
    return NextResponse.json(
      { error: { code: "API_UNREACHABLE", message } },
      { status: 502 },
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
