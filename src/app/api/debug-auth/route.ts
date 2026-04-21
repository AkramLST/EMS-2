import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("[Debug Auth] Starting debug auth check");

    // Log all cookies
    console.log("[Debug Auth] All cookies:", request.cookies);

    // Check specifically for auth-token
    const authToken = request.cookies.get("auth-token");
    console.log("[Debug Auth] Auth token cookie:", authToken);

    // Try to get auth user
    const user = await getAuthUser(request);
    console.log("[Debug Auth] User from getAuthUser:", user?.email);

    return NextResponse.json({
      message: "Debug auth check complete",
      hasAuthToken: !!authToken,
      authTokenValue: authToken?.value?.substring(0, 20) + "...",
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        roles: user.roles || [],
        employee: user.employee ? {
          firstName: user.employee.firstName,
          lastName: user.employee.lastName,
          employeeId: user.employee.employeeId
        } : null
      } : null,
    });
  } catch (error) {
    console.error("[Debug Auth] Error:", error);
    return NextResponse.json(
      {
        message: "Debug auth error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
