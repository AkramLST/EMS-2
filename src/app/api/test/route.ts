import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("=== Testing basic API endpoint ===");

    const user = await getAuthUser({} as any);

    if (!user) {
      console.log("No authenticated user");
      return NextResponse.json({
        message: "No authenticated user",
        status: "UNAUTHENTICATED"
      });
    }

    console.log("Authenticated user:", user.email, user.role);

    return NextResponse.json({
      message: "API is working correctly",
      status: "SUCCESS",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasEmployee: !!user.employee
      }
    });

  } catch (error) {
    console.error("API test failed:", error);
    return NextResponse.json(
      {
        message: "API test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
