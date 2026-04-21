import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Map your frontend role string → Prisma enum
const ROLE_MAP: Record<string, any> = {
  ADMINISTRATOR: "ADMINISTRATOR",
  HR_MANAGER: "HR_MANAGER",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  EMPLOYEE: "EMPLOYEE",
  PAYROLL_OFFICER: "PAYROLL_OFFICER",
  SYSTEM_AUDITOR: "SYSTEM_AUDITOR",

  // Optional legacy roles
  SUPER_ADMIN: "ADMINISTRATOR",
  HR_ADMIN: "HR_MANAGER",
  MANAGER: "DEPARTMENT_MANAGER",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // ✅ Validate role param
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

    // ✅ Fetch permissions with JOIN
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: roleEnum },
      select: {
        permission: {
          select: { name: true },
        },
      },
    });

    // ✅ Extract permission names
    const permissions = rolePermissions.map((rp) => rp.permission.name);

    return NextResponse.json({
      role,
      permissions,
    });
  } catch (error) {
    console.error("Error fetching role permissions:", error);

    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
