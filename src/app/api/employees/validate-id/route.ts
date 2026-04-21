import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// Disable caching for this route to always get fresh data
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const currentId = searchParams.get("currentId");

    if (!employeeId) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Check if employee ID already exists (excluding the current employee)
    const whereClause: any = {
      employeeId: employeeId,
    };

    // Exclude current employee if provided
    if (currentId) {
      whereClause.id = {
        not: currentId,
      };
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
      },
    });

    return NextResponse.json({
      exists: !!existingEmployee,
      employeeId: employeeId,
    });
  } catch (error) {
    console.error("Employee ID validation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
