import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  expireStaleSessions,
  normalizeSessionStatus,
  SESSION_THRESHOLDS,
} from "@/lib/session-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("=== User Status API Called ===");

    // Get authenticated user
    const user = await getAuthUser(request);

    if (!user) {
      console.log("No authenticated user found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.email, user.role);

    // Check permissions
    const canSeeAllStatuses = hasPermission(user, "employee.read_all");
    const canSeeTeamStatuses = user.role === "DEPARTMENT_MANAGER";

    console.log("=== DEBUG: User Permissions ===");
    console.log("User ID:", user.id);
    console.log("User Email:", user.email);
    console.log("User Role:", user.role);
    console.log("Can see all statuses:", canSeeAllStatuses);
    console.log("Can see team statuses:", canSeeTeamStatuses);
    console.log("User employee profile:", user.employee ? "EXISTS" : "MISSING");
    if (user.employee) {
      console.log("Employee ID:", user.employee.employeeId);
      console.log("Department ID:", user.employee.departmentId || "NULL");
      console.log("Department Name:", user.employee.department?.name || "NO DEPARTMENT");
    }

    if (!canSeeAllStatuses && !canSeeTeamStatuses) {
      console.log("❌ ACCESS DENIED: User doesn't have permission to view user statuses");
      return NextResponse.json(
        { message: "Insufficient permissions to view user statuses" },
        { status: 403 }
      );
    }

    // Build where clause based on permissions
    let sessionsWhereClause: any = {
      isActive: true,
      lastActivity: {
        gte: new Date(Date.now() - SESSION_THRESHOLDS.offlineMs),
      },
    };

    let departmentUserIds: string[] = [];

    // If user is department manager, filter to their department only
    if (canSeeTeamStatuses && !canSeeAllStatuses) {
      console.log("🔍 DEPARTMENT MANAGER LOGIC: Processing department filtering...");

      if (!user.employee || !user.employee.departmentId) {
        console.log("❌ DEPARTMENT MANAGER ERROR: No employee profile or departmentId");
        console.log("   User has employee profile:", !!user.employee);
        console.log("   Department ID:", user.employee?.departmentId || "NULL");
        return NextResponse.json({
          message: "Department manager profile not properly configured. Please contact administrator.",
          users: [],
          total: 0,
          online: 0,
          away: 0,
          busy: 0,
          offline: 0,
          debug: {
            error: "NO_EMPLOYEE_PROFILE",
            hasEmployeeProfile: !!user.employee,
            departmentId: user.employee?.departmentId
          }
        });
      }

      try {
        console.log("✅ DEPARTMENT MANAGER: Has valid employee profile");
        console.log("   Department ID:", user.employee.departmentId);

        // Get all employees in the department manager's department
        const departmentEmployees = await prisma.employee.findMany({
          where: {
            departmentId: user.employee.departmentId,
          },
          select: {
            userId: true,
          },
        });

        console.log("🔍 DEPARTMENT EMPLOYEES QUERY RESULT:");
        console.log("   Department ID:", user.employee.departmentId);
        console.log("   Employees found:", departmentEmployees.length);
        console.log("   User IDs:", departmentEmployees.map(e => e.userId));

        departmentUserIds = departmentEmployees
          .map(emp => emp.userId)
          .filter(Boolean) as string[];

        if (departmentUserIds.length > 0) {
          sessionsWhereClause.userId = {
            in: departmentUserIds,
          };
          console.log("✅ DEPARTMENT FILTERING: Applied department filter");
          console.log("   Filtered user IDs:", departmentUserIds);
        } else {
          console.log("❌ DEPARTMENT FILTERING: No users found in department");
          return NextResponse.json({
            message: "No team members found in your department",
            users: [],
            total: 0,
            online: 0,
            away: 0,
            busy: 0,
            offline: 0,
            debug: {
              error: "NO_TEAM_MEMBERS",
              departmentId: user.employee.departmentId,
              employeesFound: departmentEmployees.length
            }
          });
        }
      } catch (deptError) {
        console.error("❌ DEPARTMENT ERROR: Database query failed:", deptError);
        return NextResponse.json({
          message: "Error retrieving department team data. Please try again.",
          error: deptError instanceof Error ? deptError.message : "Unknown error",
          users: [],
          total: 0,
          online: 0,
          away: 0,
          busy: 0,
          offline: 0,
          debug: {
            error: "DEPARTMENT_QUERY_ERROR",
            departmentId: user.employee?.departmentId
          }
        });
      }
    } else {
      console.log("ℹ️  NOT A DEPARTMENT MANAGER: User role =", user.role);
      console.log("   Can see all statuses:", canSeeAllStatuses);
      console.log("   Can see team statuses:", canSeeTeamStatuses);
    }

    // Expire or downgrade stale sessions before we fetch
    await expireStaleSessions(prisma);

    console.log("Fetching active sessions with where clause:", sessionsWhereClause);

    // Get all active sessions with user info
    const activeSessions = await prisma.userSession.findMany({
      where: sessionsWhereClause,
      include: {
        user: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                profileImage: true,
                department: {
                  select: {
                    name: true,
                  },
                },
                designation: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    console.log("Found active sessions:", activeSessions.length);

    // Group sessions by user and determine their current status
    const userStatusMap = new Map();

    activeSessions.forEach((session: any) => {
      const userId = session.userId;
      const employee = session.user.employee;

      if (!employee) return;

      const normalizedStatus = normalizeSessionStatus(
        session.status,
        session.lastActivity
      );

      if (!userStatusMap.has(userId)) {
        userStatusMap.set(userId, {
          userId,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          profileImage: employee.profileImage,
          department: employee.department?.name || "N/A",
          designation: employee.designation?.title || "N/A",
          status: normalizedStatus,
          lastActivity: session.lastActivity,
          sessions: [session],
        });
      } else {
        const existing = userStatusMap.get(userId);
        existing.sessions.push(session);

        // Update status to most "active" status
        const statusPriority: { [key: string]: number } = {
          OFFLINE: 0,
          AWAY: 1,
          BUSY: 2,
          ONLINE: 3,
        };
        if (statusPriority[normalizedStatus] > statusPriority[existing.status]) {
          existing.status = normalizedStatus;
          existing.lastActivity = session.lastActivity;
        }
      }
    });

    // Get users who are offline (no active sessions)
    const onlineUserIds = Array.from(userStatusMap.keys());
    let offlineUsersWhereClause: any = {
      id: {
        notIn: onlineUserIds,
      },
      employee: {
        isNot: null,
      },
    };

    // If user is department manager, filter offline users to their department only
    if (canSeeTeamStatuses && !canSeeAllStatuses && departmentUserIds.length > 0) {
      offlineUsersWhereClause.id = {
        in: departmentUserIds,
        notIn: onlineUserIds,
      };
    }

    const offlineUsers = await prisma.user.findMany({
      where: offlineUsersWhereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            profileImage: true,
            department: {
              select: {
                name: true,
              },
            },
            designation: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    console.log("Found offline users:", offlineUsers.length);

    const offlineUserStatuses = offlineUsers
      .map((user) => {
        if (!user.employee) return null;
        return {
          userId: user.id,
          employeeId: user.employee.employeeId,
          firstName: user.employee.firstName,
          lastName: user.employee.lastName,
          profileImage: user.employee.profileImage,
          department: user.employee.department?.name || "N/A",
          designation: user.employee.designation?.title || "N/A",
          status: "OFFLINE" as const,
          lastActivity: null,
          sessions: [],
        };
      })
      .filter(Boolean);

    const allStatuses = [
      ...Array.from(userStatusMap.values()),
      ...offlineUserStatuses,
    ];

    console.log("Final results:", {
      total: allStatuses.length,
      online: allStatuses.filter((u) => u.status === "ONLINE").length,
      away: allStatuses.filter((u) => u.status === "AWAY").length,
      busy: allStatuses.filter((u) => u.status === "BUSY").length,
      offline: allStatuses.filter((u) => u.status === "OFFLINE").length,
    });

    return NextResponse.json({
      users: allStatuses,
      total: allStatuses.length,
      online: allStatuses.filter((u) => u.status === "ONLINE").length,
      away: allStatuses.filter((u) => u.status === "AWAY").length,
      busy: allStatuses.filter((u) => u.status === "BUSY").length,
      offline: allStatuses.filter((u) => u.status === "OFFLINE").length,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
