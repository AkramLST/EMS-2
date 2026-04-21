import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getRoleDisplayName,
  getRoleDescription,
  canAssignRole,
  getAssignableRoles,
} from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to read user data
    if (!hasPermission(user, "user.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (userId) {
      // Get specific user
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          employee: {
            include: {
              department: true,
              manager: true,
            },
          },
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          ...targetUser,
          roleDisplayName: getRoleDisplayName(targetUser.role),
          roleDescription: getRoleDescription(targetUser.role),
        },
        assignableRoles: getAssignableRoles(user.role),
      });
    }

    // Get all users with role information
    const users = await prisma.user.findMany({
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });

    const usersWithRoleInfo = users.map((u) => ({
      ...u,
      roleDisplayName: getRoleDisplayName(u.role),
      roleDescription: getRoleDescription(u.role),
      canEditRole: canAssignRole(user.role, u.role),
    }));

    // Get role statistics
    const roleStats = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    const roleStatsWithDisplayNames = roleStats.map((stat) => ({
      role: stat.role,
      count: stat._count.role,
      displayName: getRoleDisplayName(stat.role),
      description: getRoleDescription(stat.role),
    }));

    return NextResponse.json({
      users: usersWithRoleInfo,
      roleStats: roleStatsWithDisplayNames,
      assignableRoles: getAssignableRoles(user.role),
    });
  } catch (error) {
    console.error("Get users with roles error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to assign roles
    if (!hasPermission(user, "user.assign_roles")) {
      return NextResponse.json(
        { message: "Insufficient permissions to assign roles" },
        { status: 403 }
      );
    }

    const { userId, newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json(
        { message: "User ID and new role are required" },
        { status: 400 }
      );
    }

    // Check if the user can assign this specific role
    if (!canAssignRole(user.role, newRole)) {
      return NextResponse.json(
        {
          message: `You don't have permission to assign the role: ${getRoleDisplayName(
            newRole
          )}`,
        },
        { status: 403 }
      );
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prevent users from modifying their own role
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { message: "You cannot modify your own role" },
        { status: 400 }
      );
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: `Successfully updated user role from ${getRoleDisplayName(
        targetUser.role
      )} to ${getRoleDisplayName(newRole)}`,
      user: {
        ...updatedUser,
        roleDisplayName: getRoleDisplayName(updatedUser.role),
        roleDescription: getRoleDescription(updatedUser.role),
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
