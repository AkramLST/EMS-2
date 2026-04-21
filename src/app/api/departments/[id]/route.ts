import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update departments
    if (!hasPermission(user, "department.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { name, description } = await request.json();

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name,
        description,
      },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete departments
    if (!hasPermission(user, "department.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if department has employees
    const employeeCount = await prisma.employee.count({
      where: { departmentId: params.id },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          message:
            "Cannot delete department with employees. Please reassign employees first.",
        },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
