import { NextRequest, NextResponse } from "next/server";
import { clearAuthTokenCookie } from "@/lib/cookies";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Get current user to clean up their sessions
    const user = await getAuthUser(request);
    
    if (user) {
      try {
        // Mark all user sessions as inactive/offline
        await prisma.userSession.updateMany({
          where: {
            userId: user.id,
            isActive: true,
          },
          data: {
            isActive: false,
            status: "OFFLINE",
          },
        });
        console.log("[Logout API] User sessions marked as offline for user:", user.id);
      } catch (sessionError) {
        console.error("[Logout API] Failed to update sessions:", sessionError);
        // Don't fail logout if session cleanup fails
      }

      // Create audit log for logout
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGOUT",
          resource: "user",
          resourceId: user.id,
          details: `User logged out: ${user.email}`,
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    }

    // Return success response with cookie clearing header
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    // Set the cookie to clear the auth token
    const isProduction = process.env.NODE_ENV === "production";
    let cookieString =
      "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Lax";

    // Only add Secure flag in production environment
    if (isProduction) {
      cookieString += "; Secure";
    }

    response.headers.set("Set-Cookie", cookieString);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "Error during logout" },
      { status: 500 }
    );
  }
}
