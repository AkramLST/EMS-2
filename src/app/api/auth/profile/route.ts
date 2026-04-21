import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const result = await requirePermission(request, "employee.update");

    // Check if there was an error
    if (result.error) {
      return NextResponse.json(result.error, { status: result.status });
    }

    // Extract user from result
    const { user } = result;

    const { firstName, lastName, phone, bio } = await request.json();

    // Update employee profile
    const updatedEmployee = await prisma.employee.update({
      where: { userId: user.id },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        // Add bio field to employee model if needed
      },
      include: {
        department: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
