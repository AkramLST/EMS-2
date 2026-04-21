import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authTokenFromCookie = request.cookies.get("auth-token")?.value;

    if (authTokenFromCookie) {
      // Test verification
      const payload = verifyToken(authTokenFromCookie);

      return NextResponse.json({
        cookieFound: !!authTokenFromCookie,
        tokenLength: authTokenFromCookie?.length,
        tokenPreview: authTokenFromCookie?.substring(0, 50) + "...",
        verificationSuccess: !!payload,
        payload: payload,
      });
    } else {
      return NextResponse.json({
        cookieFound: false,
        message: "No auth-token cookie found",
      });
    }
  } catch (error) {
    console.error("[Test Middleware] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
