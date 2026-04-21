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

    if (!hasPermission(user.role, "inventory.generate_reports")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let report: any = {};

    switch (reportType) {
      case "asset_allocation":
        report = await generateAssetAllocationReport();
        break;

      case "asset_lifecycle":
        report = await generateAssetLifecycleReport(startDate, endDate);
        break;

      case "inventory_stock":
        report = await generateInventoryStockReport();
        break;

      case "lost_damaged":
        report = await generateLostDamagedReport(startDate, endDate);
        break;

      case "depreciation":
        report = await generateDepreciationReport();
        break;

      default:
        return NextResponse.json(
          { message: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateAssetAllocationReport() {
  const assignments = await prisma.assetAssignment.findMany({
    where: { status: "ASSIGNED" },
    include: {
      asset: {
        include: {
          category: true,
        },
      },
      employee: {
        include: {
          department: true,
        },
      },
    },
  });

  const summary = {
    totalAssigned: assignments.length,
    byDepartment: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byEmployee: assignments
      .filter((a) => a.employee) // Filter out assignments without employees
      .map((a) => ({
        employeeId: a.employee!.employeeId,
        employeeName: `${a.employee!.firstName} ${a.employee!.lastName}`,
        department: a.employee!.department?.name,
        assetName: a.asset.name,
        assetCode: a.asset.assetCode,
        category: a.asset.category.name,
        assignedDate: a.assignedDate,
        expectedReturn: a.expectedReturnDate,
      })),
  };

  // Count by department
  assignments.forEach((assignment) => {
    if (assignment.employee) {
      const dept = assignment.employee.department?.name || "Unknown";
      summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
    }
  });

  // Count by category
  assignments.forEach((assignment) => {
    const category = assignment.asset.category.name;
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  });

  return {
    title: "Asset Allocation Report",
    generated: new Date(),
    summary,
  };
}

async function generateAssetLifecycleReport(
  startDate?: string | null,
  endDate?: string | null
) {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const [assignments, returns, maintenance, disposals] = await Promise.all([
    prisma.assetAssignment.findMany({
      where: startDate || endDate ? { assignedDate: dateFilter } : {},
      include: {
        asset: { include: { category: true } },
        employee: true,
      },
    }),
    prisma.assetAssignment.findMany({
      where: {
        status: "RETURNED",
        ...(startDate || endDate ? { returnDate: dateFilter } : {}),
      },
      include: {
        asset: { include: { category: true } },
        employee: true,
      },
    }),
    prisma.maintenanceRecord.findMany({
      where: startDate || endDate ? { scheduledDate: dateFilter } : {},
      include: {
        asset: { include: { category: true } },
      },
    }),
    prisma.assetDisposal.findMany({
      where: startDate || endDate ? { disposalDate: dateFilter } : {},
      include: {
        asset: { include: { category: true } },
      },
    }),
  ]);

  return {
    title: "Asset Lifecycle Report",
    period: { startDate, endDate },
    generated: new Date(),
    summary: {
      newAssignments: assignments.length,
      returns: returns.length,
      maintenanceActivities: maintenance.length,
      disposals: disposals.length,
    },
    details: {
      assignments: assignments
        .filter((a) => a.employee) // Filter out assignments without employees
        .map((a) => ({
          assetCode: a.asset.assetCode,
          assetName: a.asset.name,
          category: a.asset.category.name,
          assignedTo: `${a.employee!.firstName} ${a.employee!.lastName}`,
          assignedDate: a.assignedDate,
        })),
      returns: returns
        .filter((r) => r.employee) // Filter out returns without employees
        .map((r) => ({
          assetCode: r.asset.assetCode,
          assetName: r.asset.name,
          returnedBy: `${r.employee!.firstName} ${r.employee!.lastName}`,
          returnDate: r.returnDate,
          condition: r.returnCondition,
        })),
      maintenance: maintenance.map((m) => ({
        assetCode: m.asset.assetCode,
        assetName: m.asset.name,
        type: m.type,
        scheduledDate: m.scheduledDate,
        status: m.status,
        cost: m.cost,
      })),
      disposals: disposals.map((d) => ({
        assetCode: d.asset.assetCode,
        assetName: d.asset.name,
        disposalType: d.disposalType,
        disposalDate: d.disposalDate,
        disposalValue: d.disposalValue,
        reason: d.reason,
      })),
    },
  };
}

async function generateInventoryStockReport() {
  const stockItems = await prisma.stockItem.findMany({
    include: {
      category: true,
      _count: {
        select: {
          stockMovements: true,
        },
      },
    },
  });

  const lowStockItems = stockItems.filter(
    (item) => item.currentStock <= item.reorderLevel
  );
  const outOfStockItems = stockItems.filter((item) => item.currentStock === 0);

  return {
    title: "Inventory Stock Report",
    generated: new Date(),
    summary: {
      totalItems: stockItems.length,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      totalValue: stockItems.reduce(
        (sum, item) =>
          sum + (item.unitCost?.toNumber() || 0) * item.currentStock,
        0
      ),
    },
    details: {
      allItems: stockItems.map((item) => ({
        itemCode: item.itemCode,
        name: item.name,
        category: item.category.name,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        reorderLevel: item.reorderLevel,
        unitCost: item.unitCost,
        totalValue: (item.unitCost?.toNumber() || 0) * item.currentStock,
        status:
          item.currentStock === 0
            ? "Out of Stock"
            : item.currentStock <= item.reorderLevel
            ? "Low Stock"
            : "Normal",
      })),
      lowStock: lowStockItems.map((item) => ({
        itemCode: item.itemCode,
        name: item.name,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        deficit: item.reorderLevel - item.currentStock,
      })),
    },
  };
}

async function generateLostDamagedReport(
  startDate?: string | null,
  endDate?: string | null
) {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const [lostAssets, damagedAssets, damagedReturns] = await Promise.all([
    prisma.asset.findMany({
      where: {
        status: "LOST",
        ...(startDate || endDate ? { updatedAt: dateFilter } : {}),
      },
      include: {
        category: true,
        assignments: {
          where: { status: "LOST" },
          include: { employee: true },
        },
      },
    }),
    prisma.asset.findMany({
      where: {
        condition: "DAMAGED",
        ...(startDate || endDate ? { updatedAt: dateFilter } : {}),
      },
      include: {
        category: true,
        assignments: {
          include: { employee: true },
        },
      },
    }),
    prisma.assetAssignment.findMany({
      where: {
        returnCondition: "DAMAGED",
        ...(startDate || endDate ? { returnDate: dateFilter } : {}),
      },
      include: {
        asset: { include: { category: true } },
        employee: true,
      },
    }),
  ]);

  return {
    title: "Lost & Damaged Assets Report",
    period: { startDate, endDate },
    generated: new Date(),
    summary: {
      lostAssets: lostAssets.length,
      damagedAssets: damagedAssets.length,
      damagedReturns: damagedReturns.length,
    },
    details: {
      lostAssets: lostAssets.map((asset) => ({
        assetCode: asset.assetCode,
        assetName: asset.name,
        category: asset.category.name,
        lastKnownUser: asset.assignments[0]?.employee
          ? `${asset.assignments[0].employee.firstName} ${asset.assignments[0].employee.lastName}`
          : "Unknown",
        lastAssignmentDate: asset.assignments[0]?.assignedDate,
      })),
      damagedAssets: damagedAssets.map((asset) => ({
        assetCode: asset.assetCode,
        assetName: asset.name,
        category: asset.category.name,
        currentCondition: asset.condition,
      })),
      damagedReturns: damagedReturns
        .filter((r) => r.employee) // Filter out returns without employees
        .map((r) => ({
          assetCode: r.asset.assetCode,
          assetName: r.asset.name,
          returnedBy: `${r.employee!.firstName} ${r.employee!.lastName}`,
          returnDate: r.returnDate,
          returnNotes: r.returnNotes,
        })),
    },
  };
}

async function generateDepreciationReport() {
  const assets = await prisma.asset.findMany({
    where: {
      status: {
        notIn: ["DISPOSED", "LOST", "STOLEN"],
      },
      purchaseDate: {
        not: null,
      },
    },
    include: {
      category: true,
    },
  });

  // Calculate depreciation for each asset
  const depreciatedAssets = assets.map((asset) => {
    if (!asset.purchaseDate || !asset.purchasePrice) {
      return {
        ...asset,
        currentValue: asset.purchasePrice?.toNumber() || 0,
        depreciation: 0,
        depreciationRate: asset.depreciationRate?.toNumber() || 0,
      };
    }

    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const yearsOwned =
      (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Simple straight-line depreciation
    const annualDepreciation =
      (asset.purchasePrice.toNumber() *
        (asset.depreciationRate?.toNumber() || 0)) /
      100;
    const totalDepreciation = annualDepreciation * yearsOwned;
    const currentValue = Math.max(
      0,
      asset.purchasePrice.toNumber() - totalDepreciation
    );

    return {
      ...asset,
      currentValue,
      depreciation: totalDepreciation,
      depreciationRate: asset.depreciationRate?.toNumber() || 0,
    };
  });

  // Group by category
  const byCategory: Record<
    string,
    { count: number; totalValue: number; totalDepreciation: number }
  > = {};

  depreciatedAssets.forEach((asset) => {
    const category = asset.category.name;
    if (!byCategory[category]) {
      byCategory[category] = {
        count: 0,
        totalValue: 0,
        totalDepreciation: 0,
      };
    }

    byCategory[category].count += 1;
    byCategory[category].totalValue += asset.currentValue;
    byCategory[category].totalDepreciation += asset.depreciation;
  });

  return {
    title: "Asset Depreciation Report",
    generated: new Date(),
    summary: {
      totalAssets: assets.length,
      totalOriginalValue: assets.reduce(
        (sum, asset) => sum + (asset.purchasePrice?.toNumber() || 0),
        0
      ),
      totalCurrentValue: depreciatedAssets.reduce(
        (sum, asset) => sum + asset.currentValue,
        0
      ),
      totalDepreciation: depreciatedAssets.reduce(
        (sum, asset) => sum + asset.depreciation,
        0
      ),
    },
    byCategory,
    details: depreciatedAssets.map((asset) => ({
      assetCode: asset.assetCode,
      assetName: asset.name,
      category: asset.category.name,
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice?.toNumber(),
      currentValue: asset.currentValue,
      depreciation: asset.depreciation,
      depreciationRate: asset.depreciationRate,
    })),
  };
}
