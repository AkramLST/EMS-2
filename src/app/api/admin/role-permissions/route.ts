import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Permission,
  ROLE_PERMISSIONS,
  clearPermissionCache,
} from "@/lib/permissions";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET - Fetch all role permissions from database
 * Admin only - requires system.admin permission
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can view role permissions
    if (!hasPermission(user, "system.admin")) {
      return NextResponse.json(
        { message: "Insufficient permissions. Administrator access required." },
        { status: 403 },
      );
    }

    // Get role permissions from the hardcoded ROLE_PERMISSIONS
    // Note: The database rolePermission model doesn't exist in the schema
    const rolePermissions = ROLE_PERMISSIONS;

    // Group permissions by role (ROLE_PERMISSIONS is already grouped)
    const groupedPermissions: Record<string, string[]> = {};

    Object.entries(rolePermissions).forEach(([role, permissions]) => {
      groupedPermissions[role] = permissions;
    });

    // Get all available permissions from the Permission type
    const allPermissions = Object.keys(ROLE_PERMISSIONS).reduce((acc, role) => {
      const perms = ROLE_PERMISSIONS[role];
      perms.forEach((perm) => {
        if (!acc.includes(perm)) {
          acc.push(perm);
        }
      });
      return acc;
    }, [] as string[]);

    return NextResponse.json({
      success: true,
      rolePermissions: groupedPermissions,
      allPermissions: allPermissions.sort(),
      message: "Role permissions loaded from hardcoded configuration",
    });
  } catch (error) {
    console.error("Get role permissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update role permissions
 * Admin only - requires system.admin permission
 *
 * Expected body: {
 *   role: string,
 *   permissions: string[] // List of permission IDs to enable
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can update role permissions
    if (!hasPermission(user, "system.admin")) {
      return NextResponse.json(
        { message: "Insufficient permissions. Administrator access required." },
        { status: 403 },
      );
    }

    const { role, permissions } = await request.json();

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json(
        { message: "Invalid request. Role and permissions array required." },
        { status: 400 },
      );
    }

    // Validate role exists
    const validRoles = [
      "ADMINISTRATOR",
      "HR_MANAGER",
      "DEPARTMENT_MANAGER",
      "EMPLOYEE",
      "PAYROLL_OFFICER",
      "SYSTEM_AUDITOR",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: `Invalid role: ${role}` },
        { status: 400 },
      );
    }

    // Get all available permissions
    const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
    const uniquePermissions = Array.from(new Set(allPermissions));

    // Validate all provided permissions exist
    const invalidPermissions = permissions.filter(
      (p) => !uniquePermissions.includes(p as Permission),
    );
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { message: `Invalid permissions: ${invalidPermissions.join(", ")}` },
        { status: 400 },
      );
    }

    // Dynamic permission updates are not supported as the rolePermission model doesn't exist
    // Permissions are managed via the hardcoded ROLE_PERMISSIONS in src/lib/permissions.ts
    return NextResponse.json(
      {
        message:
          "Dynamic permission updates are not supported. Permissions are managed via the hardcoded configuration in src/lib/permissions.ts",
        currentPermissions: ROLE_PERMISSIONS[role] || [],
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Update role permissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Reset role permissions to default (from hardcoded values)
 * Admin only - requires system.admin permission
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can reset permissions
    if (!hasPermission(user, "system.admin")) {
      return NextResponse.json(
        { message: "Insufficient permissions. Administrator access required." },
        { status: 403 },
      );
    }

    const { role } = await request.json();

    if (!role) {
      return NextResponse.json(
        { message: "Role is required" },
        { status: 400 },
      );
    }

    // Get default permissions for this role
    const defaultPermissions = ROLE_PERMISSIONS[role];
    if (!defaultPermissions) {
      return NextResponse.json(
        { message: `Invalid role: ${role}` },
        { status: 400 },
      );
    }

    // Permissions are already hardcoded, no reset needed
    return NextResponse.json({
      message:
        "Permissions are already at default values (hardcoded configuration)",
      role,
      currentPermissions: defaultPermissions,
      permissionsCount: defaultPermissions.length,
    });
  } catch (error) {
    console.error("Reset role permissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
