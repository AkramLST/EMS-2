import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("=== Simple User Status API Test ===");

    const user = await getAuthUser(request);
    console.log("User:", user ? user.email : "NO USER");

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Simple permission check
    const canSeeAllStatuses = hasPermission(user, "employee.read_all");
    const canSeeTeamStatuses = user.role === "DEPARTMENT_MANAGER";

    console.log("Can see all:", canSeeAllStatuses);
    console.log("Can see team:", canSeeTeamStatuses);

    if (!canSeeAllStatuses && !canSeeTeamStatuses) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Return simple test data
    return NextResponse.json({
      message: "Simple API test successful",
      users: [],
      total: 0,
      online: 0,
      away: 0,
      busy: 0,
      offline: 0,
      test: true
    });

  } catch (error) {
    console.error("Simple API test error:", error);
    return NextResponse.json(
      {
        message: "Simple API test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
