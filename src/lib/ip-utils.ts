import { NextRequest } from "next/server";

/**
 * Extract client IP address from request
 * Handles various proxy headers and fallbacks
 */
export function getClientIpAddress(request: NextRequest): string {
  // Try to get IP from various headers (in order of preference)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIp = xForwardedFor.split(",")[0].trim();
    // Handle IPv6 addresses in brackets
    if (firstIp.startsWith("[") && firstIp.endsWith("]")) {
      return firstIp.substring(1, firstIp.length - 1);
    }
    // Validate that it's not a private IP
    if (!isPrivateIP(firstIp)) {
      return firstIp;
    }
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    const trimmedIp = xRealIp.trim();
    if (!isPrivateIP(trimmedIp)) {
      return trimmedIp;
    }
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    const trimmedIp = cfConnectingIp.trim();
    if (!isPrivateIP(trimmedIp)) {
      return trimmedIp;
    }
  }

  const trueClientIp = request.headers.get("true-client-ip");
  if (trueClientIp) {
    const trimmedIp = trueClientIp.trim();
    if (!isPrivateIP(trimmedIp)) {
      return trimmedIp;
    }
  }

  // If we only have private IPs, return the first one we found
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  if (xRealIp) {
    return xRealIp.trim();
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  if (trueClientIp) {
    return trueClientIp.trim();
  }

  // Try to get IP from request socket info
  // @ts-ignore - socket property might not be in the type definition but exists in runtime
  if (request.socket && request.socket.remoteAddress) {
    // @ts-ignore
    return request.socket.remoteAddress;
  }

  // Fallback to request IP if available
  // @ts-ignore - ip property might not be in the type definition but exists in runtime
  if (request.ip) {
    // @ts-ignore
    return request.ip;
  }

  // Try connection info
  // @ts-ignore
  if (request.connection && request.connection.remoteAddress) {
    // @ts-ignore
    return request.connection.remoteAddress;
  }

  // Final fallback
  return "unknown";
}

/**
 * Check if an IP address is private
 */
function isPrivateIP(ip: string): boolean {
  // Handle IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      const first = parseInt(parts[0]);
      // 10.x.x.x
      if (first === 10) return true;
      // 172.16.x.x - 172.31.x.x
      if (first === 172 && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31)
        return true;
      // 192.168.x.x
      if (first === 192 && parseInt(parts[1]) === 168) return true;
      // 127.x.x.x (loopback)
      if (first === 127) return true;
    }
    return false;
  }

  // Handle IPv6
  if (ip.includes(":")) {
    // ::1 (loopback)
    if (ip === "::1") return true;
    // fe80::/10 (link-local)
    if (ip.startsWith("fe80:")) return true;
    // fc00::/7 (unique local)
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  }

  return false;
}
