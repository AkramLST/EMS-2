import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Role migration mapping from old roles to new roles
const ROLE_MIGRATION_MAP: Record<string, string> = {
  SUPER_ADMIN: "ADMINISTRATOR",
  HR_ADMIN: "HR_MANAGER",
  MANAGER: "DEPARTMENT_MANAGER",
  // Keep these as they are already in the new system
  EMPLOYEE: "EMPLOYEE",
  HR_MANAGER: "HR_MANAGER",
  // New roles (no migration needed)
  ADMINISTRATOR: "ADMINISTRATOR",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  PAYROLL_OFFICER: "PAYROLL_OFFICER",
  SYSTEM_AUDITOR: "SYSTEM_AUDITOR",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can perform role migration
    if (!hasPermission(user, "system.admin")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get all users with legacy roles
    const usersToMigrate = await prisma.user.findMany({
      where: {
        role: {
          in: ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"],
        },
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (usersToMigrate.length === 0) {
      return NextResponse.json({
        message: "No users found with legacy roles to migrate",
        migratedCount: 0,
      });
    }

    // Perform migration
    const migrationResults = [];

    for (const userToMigrate of usersToMigrate) {
      const oldRole = userToMigrate.role;
      const newRole = ROLE_MIGRATION_MAP[oldRole];

      if (newRole && newRole !== oldRole) {
        await prisma.user.update({
          where: { id: userToMigrate.id },
          data: { role: newRole as any },
        });

        migrationResults.push({
          userId: userToMigrate.id,
          email: userToMigrate.email,
          oldRole,
          newRole,
          employeeName: userToMigrate.employee
            ? `${userToMigrate.employee.firstName} ${userToMigrate.employee.lastName}`
            : "No employee record",
        });
      }
    }

    return NextResponse.json({
      message: `Successfully migrated ${migrationResults.length} users to new role system`,
      migratedCount: migrationResults.length,
      migrationResults,
    });
  } catch (error) {
    console.error("Role migration error:", error);
    return NextResponse.json(
      { message: "Internal server error during role migration" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can view role migration status
    if (!hasPermission(user, "system.admin")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    const legacyRoles = roleDistribution.filter((item) =>
      ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"].includes(item.role),
    );

    const newRoles = roleDistribution.filter((item) =>
      [
        "ADMINISTRATOR",
        "HR_MANAGER",
        "DEPARTMENT_MANAGER",
        "EMPLOYEE",
        "PAYROLL_OFFICER",
        "SYSTEM_AUDITOR",
      ].includes(item.role),
    );

    return NextResponse.json({
      roleDistribution,
      legacyRoles,
      newRoles,
      needsMigration: legacyRoles.length > 0,
      legacyUserCount: legacyRoles.reduce(
        (sum, role) => sum + role._count.role,
        0,
      ),
    });
  } catch (error) {
    console.error("Get role migration status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
