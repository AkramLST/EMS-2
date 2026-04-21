import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("[Test DB] Checking database connection...");

    // Check if we can connect to the database
    await prisma.$connect();
    console.log("[Test DB] Database connected successfully");

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        employee: true,
      },
    });

    console.log(`[Test DB] Found ${users.length} users`);

    // Get first user details
    if (users.length > 0) {
      console.log("[Test DB] First user:", {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role,
        employee: users[0].employee
          ? {
              id: users[0].employee.id,
              firstName: users[0].employee.firstName,
              lastName: users[0].employee.lastName,
            }
          : null,
      });
    }

    return NextResponse.json({
      message: "Database test successful",
      userCount: users.length,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        employee: u.employee
          ? {
              id: u.employee.id,
              firstName: u.employee.firstName,
              lastName: u.employee.lastName,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("[Test DB] Database test error:", error);
    return NextResponse.json(
      {
        message: "Database test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
