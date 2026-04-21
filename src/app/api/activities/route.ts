import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
  performer?: {
    firstName: string;
    lastName: string;
  };
  targetEmployee?: {
    firstName: string;
    lastName: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log("Activities API called");
    
    // Early return for build time or invalid requests
    if (!request?.url) {
      console.log("Invalid request context, returning empty activities");
      return NextResponse.json({ activities: [] });
    }

    // Check if we're in a build environment (Vercel or other CI/CD)
    const isBuildTime = process.env.VERCEL_ENV === undefined && 
                       process.env.NODE_ENV !== 'development' && 
                       !process.env.DATABASE_URL;
    
    if (isBuildTime) {
      console.log("Build environment detected, returning empty activities");
      return NextResponse.json({ activities: [] });
    }

    // Check if we're in a build environment without database access
    if (!process.env.DATABASE_URL) {
      console.log("No database URL available, returning empty activities");
      return NextResponse.json({ activities: [] });
    }

    // Test database connectivity before proceeding
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.log("Database connection failed during build, returning empty activities:", dbError);
      return NextResponse.json({ activities: [] });
    }
    
    let user;
    try {
      user = await getAuthUser(request);
    } catch (authError) {
      console.log("Auth error (returning empty activities):", authError);
      return NextResponse.json({ activities: [] });
    }

    if (!user) {
      console.log("No user found in auth, returning empty activities");
      return NextResponse.json({ activities: [] });
    }

    console.log("User authenticated:", user.email, "Role:", user.role);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get recent activities based on user role
    const activities: Activity[] = [];

    // Recent attendance records
    console.log("Fetching attendance records...");
    let recentAttendance: any[] = [];
    try {
      recentAttendance = await prisma.attendanceRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
          status: "PRESENT",
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    }
    console.log("Found attendance records:", recentAttendance.length);

    recentAttendance.forEach((record) => {
      if (!record.employee) {
        return;
      }

      activities.push({
        id: `attendance_${record.id}`,
        type: "attendance",
        title: `${record.employee.firstName} ${record.employee.lastName} marked attendance`,
        description: record.employee.employeeId
          ? `Employee ${record.employee.employeeId} checked in`
          : "Employee checked in",
        timestamp: record.createdAt,
        icon: "clock",
        color: "green",
        performer: {
          firstName: record.employee.firstName,
          lastName: record.employee.lastName,
        },
      });
    });

    // Recent employee additions
    console.log("Fetching recent employees...");
    let recentEmployees: any[] = [];
    try {
      recentEmployees = await prisma.employee.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
    console.log("Found recent employees:", recentEmployees.length);

    recentEmployees.forEach((employee) => {
      const firstName = employee.firstName || "Unknown";
      const lastName = employee.lastName || "";

      activities.push({
        id: `employee_${employee.id}`,
        type: "employee_added",
        title: "New employee added",
        description: `${firstName} ${lastName}`.trim() + " joined the team",
        timestamp: employee.createdAt,
        icon: "user",
        color: "blue",
        targetEmployee: {
          firstName,
          lastName,
        },
        performer:
          user.role !== "EMPLOYEE"
            ? {
                firstName: user.employee?.firstName || "System",
                lastName: user.employee?.lastName || "",
              }
            : undefined,
      });
    });

    // Recent leave applications
    console.log("Fetching recent leave applications...");
    let recentLeaves: any[] = [];
    try {
      recentLeaves = await prisma.leaveApplication.findMany({
        where: {
          appliedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
          leaveType: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { appliedAt: "desc" },
        take: 5,
      });
    } catch (error) {
      console.error("Error fetching recent leave applications:", error);
    }
    console.log("Found recent leave applications:", recentLeaves.length);

    recentLeaves.forEach((leave) => {
      if (!leave.employee) {
        return;
      }

      const leaveTypeName = leave.leaveType?.name || "Leave";
      const status = leave.status?.toLowerCase?.() || "submitted";

      activities.push({
        id: `leave_${leave.id}`,
        type: "leave",
        title: `Leave request ${status}`,
        description: `${leave.employee.firstName} ${leave.employee.lastName} - ${leaveTypeName}`,
        timestamp: leave.appliedAt,
        icon: "calendar",
        color:
          leave.status === "PENDING"
            ? "yellow"
            : leave.status === "APPROVED"
            ? "green"
            : "red",
        performer: {
          firstName: leave.employee.firstName,
          lastName: leave.employee.lastName,
        },
        targetEmployee: {
          firstName: leave.employee.firstName,
          lastName: leave.employee.lastName,
        },
      });
    });

    // Recent leave approvals/rejections from audit logs
    console.log("Fetching leave audit logs...");
    let leaveAuditLogs: any[] = [];
    try {
      leaveAuditLogs = await prisma.auditLog.findMany({
        where: {
          resource: "leave",
          action: {
            in: ["UPDATE"],
          },
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          user: {
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      });
    } catch (error) {
      console.error("Error fetching leave audit logs:", error);
    }
    console.log("Found leave audit logs:", leaveAuditLogs.length);

    // Get leave application IDs from audit logs
    const leaveApplicationIds = leaveAuditLogs
      .filter((log) => !!log.resourceId)
      .map((log) => log.resourceId as string);

    // Fetch leave applications for these IDs
    let leaveApplications: any[] = [];
    if (leaveApplicationIds.length > 0) {
      try {
        leaveApplications = await prisma.leaveApplication.findMany({
          where: {
            id: {
              in: leaveApplicationIds,
            },
          },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
            leaveType: {
              select: {
                name: true,
              },
            },
          },
        });
      } catch (error) {
        console.error("Error fetching leave applications:", error);
      }
    }

    // Create a map for quick lookup
    const leaveAppMap = new Map(leaveApplications.map((app) => [app.id, app]));

    leaveAuditLogs.forEach((auditLog) => {
      if (!auditLog.resourceId) {
        return;
      }

      const leaveApp = leaveAppMap.get(auditLog.resourceId);
      if (leaveApp) {
        const details = auditLog.details?.toLowerCase?.() || "";
        const isApproval = details.includes("approved");
        const isRejection = details.includes("rejected");

        // Only show if it's an approval or rejection (not just status updates)
        if (isApproval || isRejection) {
          console.log("Found leave action:", {
            id: auditLog.id,
            details: auditLog.details,
            isApproval,
            isRejection,
            userId: auditLog.userId,
            userEmployee: auditLog.user.employee ? `${auditLog.user.employee.firstName} ${auditLog.user.employee.lastName}` : "No employee",
            leaveEmployee: leaveApp.employee.firstName,
            target: leaveApp.employee.firstName
          });
          activities.push({
            id: `leave_audit_${auditLog.id}`,
            type: "leave_action",
            title: `Leave request ${isApproval ? "approved" : "rejected"}`,
            description: `${leaveApp.employee.firstName} ${leaveApp.employee.lastName} - ${leaveApp.leaveType?.name || "Leave"}`,
            timestamp: auditLog.timestamp,
            icon: "calendar",
            color: isApproval ? "green" : "red",
            performer: {
              firstName: auditLog.user.employee?.firstName || "System",
              lastName: auditLog.user.employee?.lastName || "",
            },
            targetEmployee: {
              firstName: leaveApp.employee.firstName,
              lastName: leaveApp.employee.lastName,
            },
          });
        }
      }
    });

    // Recent asset assignments (if user has access)
    console.log("Fetching asset assignments...");
    let recentAssets: any[] = [];
    if (user.role !== "EMPLOYEE") {
      try {
        recentAssets = await prisma.assetAssignment.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          include: {
            asset: {
              select: {
                name: true,
                assetCode: true,
              },
            },
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        });
      } catch (error) {
        console.error("Error fetching asset assignments:", error);
      }
    }
    console.log("Found asset assignments:", recentAssets.length);

    recentAssets.forEach((assignment) => {
      if (!assignment.employee || !assignment.asset) {
        return;
      }

      activities.push({
        id: `asset_${assignment.id}`,
        type: "asset",
        title: "Asset assigned",
        description: `${assignment.asset.name} assigned to ${assignment.employee.firstName} ${assignment.employee.lastName}`,
        timestamp: assignment.createdAt,
        icon: "cube",
        color: "purple",
        performer: {
          firstName: user.employee?.firstName || "System",
          lastName: user.employee?.lastName || "",
        },
        targetEmployee: {
          firstName: assignment.employee.firstName,
          lastName: assignment.employee.lastName,
        },
      });
    });

    // Add some fallback activities for testing
    let fallbackCount = 0;
    if (activities.length === 0) {
      console.log("No activities found, adding fallback activities for testing");
      activities.push({
        id: "test_activity_1",
        type: "system",
        title: "System initialized",
        description: "Employee management system is running",
        timestamp: new Date(),
        icon: "user",
        color: "blue",
        performer: {
          firstName: "System",
          lastName: "Admin",
        },
      });
      fallbackCount++;
    }

    // Always add at least one activity for testing
    if (activities.length === 0) {
      console.log("Still no activities, adding test activity");
      activities.push({
        id: "test_activity_fallback",
        type: "test",
        title: "Test Activity",
        description: "This is a test activity to verify the system is working",
        timestamp: new Date(),
        icon: "user",
        color: "green",
        performer: {
          firstName: "Test",
          lastName: "User",
        },
      });
      fallbackCount++;
    }

    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    console.log(`Found ${sortedActivities.length} activities for user ${user.id}:`, {
      attendance: recentAttendance.length,
      employees: recentEmployees.length,
      leaves: recentLeaves.length,
      leaveAudits: leaveAuditLogs.length,
      assets: recentAssets.filter(a => a.employee).length,
      fallback: fallbackCount,
      totalBeforeSort: activities.length
    });

    console.log("Returning activities response:", {
      activitiesCount: sortedActivities.length,
      activities: sortedActivities.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        performer: `${a.performer?.firstName} ${a.performer?.lastName}`
      }))
    });

    return NextResponse.json({ activities: sortedActivities });
  } catch (error) {
    console.error("Get activities error:", error);
    // Return empty activities instead of error during build
    if (process.env.NODE_ENV === 'production' || !request?.url) {
      console.log("Returning empty activities due to build context");
      return NextResponse.json({ activities: [] });
    }
    return NextResponse.json(
      { message: "Internal server error", activities: [] },
      { status: 500 }
    );
  }
}
