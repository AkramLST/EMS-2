import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict access to non-employee roles only
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (!hasPermission(user, "inventory.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get asset counts by status
    const assetStatusCounts = await prisma.asset.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    // Get asset counts by category
    const assetCategoryCounts = await prisma.asset.groupBy({
      by: ["categoryId"],
      _count: {
        id: true,
      },
    });

    // Get total asset value
    const totalAssetValue = await prisma.asset.aggregate({
      _sum: {
        purchasePrice: true,
      },
    });

    // Get active assignments with employee details
    const activeAssignments = await prisma.assetAssignment.count({
      where: {
        status: "ASSIGNED",
      },
    });

    // Get unique employees with assignments
    const employeesWithAssets = await prisma.assetAssignment.groupBy({
      by: ["employeeId"],
      where: {
        status: "ASSIGNED",
        employeeId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Get available assets count
    const availableAssets = await prisma.asset.count({
      where: {
        status: "AVAILABLE",
      },
    });

    // Get assigned assets count
    const assignedAssets = await prisma.asset.count({
      where: {
        status: "ASSIGNED",
      },
    });

    // Get overdue assignments
    const overdueAssignments = await prisma.assetAssignment.count({
      where: {
        status: "ASSIGNED",
        expectedReturnDate: {
          lt: new Date(),
        },
      },
    });

    // Get upcoming maintenance
    const upcomingMaintenance = await prisma.maintenanceRecord.count({
      where: {
        status: "SCHEDULED",
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
    });

    // Get assets needing attention (poor condition, warranty expiring)
    const warrantyExpiringSoon = await prisma.asset.count({
      where: {
        warrantyEndDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        },
      },
    });

    const assetsNeedingAttention = await prisma.asset.count({
      where: {
        OR: [
          { condition: "POOR" },
          { condition: "DAMAGED" },
          { condition: "NEEDS_REPAIR" },
          { status: "OUT_OF_ORDER" },
        ],
      },
    });

    // Get low stock items
    const lowStockItems = await prisma.stockItem.count({
      where: {
        currentStock: {
          lte: prisma.stockItem.fields.reorderLevel,
        },
      },
    });

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentAssignments = await prisma.assetAssignment.count({
      where: {
        assignedDate: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentReturns = await prisma.assetAssignment.count({
      where: {
        returnDate: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentMaintenance = await prisma.maintenanceRecord.count({
      where: {
        completedDate: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const stats = {
      assets: {
        total: assetStatusCounts.reduce((sum, item) => sum + item._count.id, 0),
        available: availableAssets,
        assigned: assignedAssets,
        byStatus: assetStatusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byCategory: assetCategoryCounts,
        totalValue: totalAssetValue._sum.purchasePrice || 0,
        needingAttention: assetsNeedingAttention,
      },
      assignments: {
        active: activeAssignments,
        overdue: overdueAssignments,
        employeesWithAssets: employeesWithAssets.length,
        totalAssignments: activeAssignments,
      },
      maintenance: {
        upcoming: upcomingMaintenance,
      },
      alerts: {
        warrantyExpiring: warrantyExpiringSoon,
        lowStock: lowStockItems,
      },
      activity: {
        recentAssignments,
        recentReturns,
        recentMaintenance,
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Get inventory stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
