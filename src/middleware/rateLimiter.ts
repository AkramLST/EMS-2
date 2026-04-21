import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message = "Too many requests" } = options;

  return async (request: NextRequest) => {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const key = `${ip}:${request.nextUrl.pathname}`;

    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    // Initialize or increment counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      store[key].count++;
    }

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      return NextResponse.json(
        { error: message, retryAfter: Math.ceil((store[key].resetTime - now) / 1000) },
        { status: 429 }
      );
    }

    return null; // Allow request to proceed
  };
}

// Predefined rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts. Please try again later.",
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "API rate limit exceeded. Please slow down.",
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  message: "Upload rate limit exceeded. Please wait before uploading again.",
});
