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

    if (!hasPermission(user, "inventory.view_assignments")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const assetId = searchParams.get("assetId");
    const status = searchParams.get("status");

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (assetId) {
      where.assetId = assetId;
    }

    if (status) {
      where.status = status;
    }

    const assignments = await prisma.assetAssignment.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { assignedDate: "desc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
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

    if (!hasPermission(user, "inventory.assign_assets")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Check if asset is available
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    if (asset.status !== "AVAILABLE") {
      return NextResponse.json(
        { message: "Asset is not available for assignment" },
        { status: 400 }
      );
    }

    // Check for existing active assignment
    const existingAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: data.assetId,
        status: "ASSIGNED",
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { message: "Asset is already assigned" },
        { status: 400 }
      );
    }

    // Create assignment and update asset status
    const assignment = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.assetAssignment.create({
        data: {
          ...data,
          assignedBy: user.id,
          expectedReturnDate: data.expectedReturnDate
            ? new Date(data.expectedReturnDate)
            : null,
        },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { name: true } },
            },
          },
        },
      });

      await tx.asset.update({
        where: { id: data.assetId },
        data: { status: "ASSIGNED" },
      });

      return newAssignment;
    });

    return NextResponse.json({
      message: "Asset assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
