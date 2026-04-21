import { NextRequest, NextResponse } from "next/server";
import { generateToken, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Test payload
    const testPayload = {
      userId: "test-user-123",
      email: "test@example.com",
      role: "EMPLOYEE",
    };

    // Generate token
    const token = generateToken(testPayload);

    // Verify token immediately
    const verified = verifyToken(token);

    // Test with cookie parsing simulation
    const cookieString = `auth-token=${token}; path=/; max-age=604800; samesite=lax`;

    // Simulate cookie parsing like in middleware
    const parsedToken = cookieString.split("auth-token=")[1]?.split(";")[0];

    // Verify parsed token
    const verifiedParsed = verifyToken(parsedToken || "");

    return NextResponse.json({
      message: "JWT test completed",
      original: {
        token: token,
        length: token.length,
        verified: verified,
      },
      parsed: {
        token: parsedToken,
        verified: verifiedParsed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "JWT test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
