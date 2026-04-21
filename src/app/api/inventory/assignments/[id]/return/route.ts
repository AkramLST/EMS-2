import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "inventory.return_assets")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.status !== "ASSIGNED") {
      return NextResponse.json(
        { message: "Assignment is not active" },
        { status: 400 }
      );
    }

    // Process return and update asset status
    const updatedAssignment = await prisma.$transaction(async (tx) => {
      const returnedAssignment = await tx.assetAssignment.update({
        where: { id: params.id },
        data: {
          status: "RETURNED",
          returnDate: new Date(),
          returnCondition: data.returnCondition,
          returnNotes: data.returnNotes,
          returnedBy: user.id,
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

      // Update asset status based on return condition
      let newAssetStatus: AssetStatus = "AVAILABLE";
      if (
        data.returnCondition === "DAMAGED" ||
        data.returnCondition === "NEEDS_REPAIR"
      ) {
        newAssetStatus = "OUT_OF_ORDER";
      } else if (data.returnCondition === "POOR") {
        newAssetStatus = "IN_MAINTENANCE";
      }

      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          status: newAssetStatus,
          condition: data.returnCondition,
        },
      });

      return returnedAssignment;
    });

    return NextResponse.json({
      message: "Asset returned successfully",
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Return asset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
