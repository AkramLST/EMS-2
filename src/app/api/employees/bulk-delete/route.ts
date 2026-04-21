import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employeeIds } = await request.json();

    if (
      !employeeIds ||
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0
    ) {
      return NextResponse.json(
        { message: "Employee IDs are required" },
        { status: 400 }
      );
    }

    // Check if employees exist and get their userIds
    const existingEmployees = await prisma.employee.findMany({
      where: {
        id: {
          in: employeeIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true, // Include userId to delete associated users
      },
    });

    if (existingEmployees.length === 0) {
      return NextResponse.json(
        { message: "No employees found with provided IDs" },
        { status: 404 }
      );
    }

    // Extract userIds for deletion
    const userIds = existingEmployees.map((emp) => emp.userId);

    // Create audit logs before deletion
    const auditPromises = existingEmployees.map((employee) =>
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          resource: "employee",
          resourceId: employee.id,
          details: `Bulk delete: ${employee.firstName} ${employee.lastName}`,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      })
    );

    await Promise.all(auditPromises);

    // Perform bulk delete of both employees and associated users in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete employees first
      await tx.employee.deleteMany({
        where: {
          id: {
            in: employeeIds,
          },
        },
      });

      // Then delete associated users
      await tx.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
        },
      });
    });

    return NextResponse.json({
      message: `Successfully deleted ${existingEmployees.length} employees and associated users`,
      deleted: existingEmployees.length,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
