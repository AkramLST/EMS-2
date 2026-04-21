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

    if (!hasPermission(user.role, "inventory.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: any = {};

    if (assetId) {
      where.assetId = assetId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ maintenanceRecords });
  } catch (error) {
    console.error("Get maintenance records error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "inventory.schedule_maintenance")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Extract and map fields properly
    const {
      estimatedCost, // This field doesn't exist in the schema, map it to cost
      scheduledDate,
      completedDate,
      nextMaintenanceDate,
      ...otherData
    } = data;

    const maintenanceRecord = await prisma.maintenanceRecord.create({
      data: {
        ...otherData,
        // Map estimatedCost to cost if provided
        cost: estimatedCost || data.cost,
        scheduledDate: new Date(scheduledDate),
        completedDate: completedDate ? new Date(completedDate) : null,
        nextMaintenanceDate: nextMaintenanceDate
          ? new Date(nextMaintenanceDate)
          : null,
      },
      include: {
        asset: {
          include: {
            category: true,
          },
        },
      },
    });

    // Update asset status if maintenance is scheduled
    if (data.status === "SCHEDULED" || data.status === "IN_PROGRESS") {
      await prisma.asset.update({
        where: { id: data.assetId },
        data: { status: "IN_MAINTENANCE" },
      });
    }

    return NextResponse.json({
      message: "Maintenance record created successfully",
      maintenanceRecord,
    });
  } catch (error) {
    console.error("Create maintenance record error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
