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

    if (!hasPermission(user, "inventory.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const disposals = await prisma.assetDisposal.findMany({
      include: {
        asset: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { disposalDate: "desc" },
    });

    return NextResponse.json({ disposals });
  } catch (error) {
    console.error("Get asset disposals error:", error);
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

    if (!hasPermission(user, "inventory.approve_disposal")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Check if asset exists and is not already disposed
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      include: { disposalRecord: true },
    });

    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    if (asset.disposalRecord) {
      return NextResponse.json(
        { message: "Asset is already disposed" },
        { status: 400 }
      );
    }

    // Check if asset is currently assigned
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: data.assetId,
        status: "ASSIGNED",
      },
    });

    if (activeAssignment) {
      return NextResponse.json(
        { message: "Cannot dispose asset that is currently assigned" },
        { status: 400 }
      );
    }

    // Create disposal record and update asset status
    const disposal = await prisma.$transaction(async (tx) => {
      const assetDisposal = await tx.assetDisposal.create({
        data: {
          assetId: data.assetId,
          disposalDate: new Date(data.disposalDate),
          disposalType: data.disposalType,
          reason: data.reason,
          disposalValue: data.disposalValue,
          disposalCost: data.disposalCost,
          approvedBy: user.id,
          approvalDate: new Date(),
          certificates: data.certificates,
          notes: data.notes,
        },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
        },
      });

      await tx.asset.update({
        where: { id: data.assetId },
        data: { status: "DISPOSED" },
      });

      return assetDisposal;
    });

    return NextResponse.json({
      message: "Asset disposal recorded successfully",
      disposal,
    });
  } catch (error) {
    console.error("Create asset disposal error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
