import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client"; // Import enum from Prisma

const ROLE_MAP: Record<string, Role> = {
  Administrator: "ADMINISTRATOR",
  "HR Manager": "HR_MANAGER",
  "Department Manager": "DEPARTMENT_MANAGER",
  Employee: "EMPLOYEE",
  "Payroll Officer": "PAYROLL_OFFICER",
  "System Auditor": "SYSTEM_AUDITOR",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, policies } = body;
    if (!role || !Array.isArray(policies)) {
      return NextResponse.json(
        { message: "Invalid role or policies array" },
        { status: 400 },
      );
    }

    // ✅ Convert UI role → Prisma enum
    const roleEnum = ROLE_MAP[role];

    if (!roleEnum) {
      return NextResponse.json(
        { message: "Invalid role value" },
        { status: 400 },
      );
    }

    const existing = await prisma.rolePermission.findMany({
      where: { role: roleEnum },
      select: { permissionId: true },
    });

    const existingIds = existing.map((r) => r.permissionId);

    const toAdd = policies.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !policies.includes(id));

    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          role: roleEnum,
          permissionId: { in: toRemove },
        },
      });
    }

    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({
          role: roleEnum,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: "Role permissions updated successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (!role) {
      return NextResponse.json(
        { message: "Role is required" },
        { status: 400 },
      );
    }

    const roleEnum = ROLE_MAP[role];

    if (!roleEnum) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // Fetch permissions assigned to this role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: roleEnum },
      select: { permissionId: true },
    });

    const permissionIds = rolePermissions.map((rp) => rp.permissionId);

    return NextResponse.json({
      role,
      permissions: permissionIds,
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
