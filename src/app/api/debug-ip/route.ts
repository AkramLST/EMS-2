import { NextRequest, NextResponse } from "next/server";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Get all headers for debugging
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Try different ways to get IP
  const ipInfo = {
    xForwardedFor: request.headers.get("x-forwarded-for"),
    xRealIp: request.headers.get("x-real-ip"),
    remoteAddress: request.headers.get("remote-address"),
    cfConnectingIp: request.headers.get("cf-connecting-ip"),
    trueClientIp: request.headers.get("true-client-ip"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    forwarded: request.headers.get("forwarded"),
    getClientIpAddress: getClientIpAddress(request),
    // @ts-ignore
    requestIp: request.ip,
    // @ts-ignore
    socketRemoteAddress: request.socket?.remoteAddress,
    // @ts-ignore
    connectionRemoteAddress: request.connection?.remoteAddress,
  };

  return NextResponse.json({
    ipInfo,
    headers,
    url: request.url,
  });
}
