import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        assignments: {
          include: {
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
        },
        maintenanceRecords: {
          orderBy: { scheduledDate: "desc" },
          take: 5,
        },
        disposalRecord: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    // Calculate current value based on depreciation
    let currentValue = 0;
    if (asset.purchasePrice) {
      const purchasePrice = Number(asset.purchasePrice);

      // If we have all the necessary data for depreciation calculation
      if (asset.purchaseDate && asset.depreciationRate) {
        const purchaseDate = new Date(asset.purchaseDate);
        const today = new Date();
        const yearsOwned =
          (today.getTime() - purchaseDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365);

        const annualDepreciation =
          (purchasePrice * Number(asset.depreciationRate)) / 100;
        const totalDepreciation = annualDepreciation * yearsOwned;
        currentValue = Math.max(0, purchasePrice - totalDepreciation);
      } else {
        // If we can't calculate depreciation, use purchase price as current value
        currentValue = purchasePrice;
      }
    }

    // Map Prisma model fields to form fields for the frontend
    const assetForForm = {
      ...asset,
      // Map description to notes
      notes: asset.description || "",
      // Map vendorName to supplier
      supplier: asset.vendorName || "",
      // Map purchasePrice to purchaseCost for consistency with form
      purchaseCost: asset.purchasePrice ? Number(asset.purchasePrice) : 0,
      // Use calculated current value
      currentValue: currentValue,
      // Map warranty dates
      warrantyExpiry: asset.warrantyEndDate
        ? asset.warrantyEndDate.toISOString().split("T")[0]
        : "",
    };

    return NextResponse.json({ asset: assetForForm });
  } catch (error) {
    console.error("Get asset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "inventory.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Handle field mappings from form to Prisma model
    const {
      categoryId,
      purchaseCost,
      currentValue,
      warrantyExpiry,
      warrantyStartDate,
      warrantyEndDate,
      notes,
      supplier,
      ...restData
    } = data;

    const updateData: any = {};

    // Copy all other fields except the ones we're mapping or don't exist in Prisma schema
    Object.keys(restData).forEach((key) => {
      if (
        ![
          "purchaseCost",
          "currentValue",
          "warrantyExpiry",
          "warrantyStartDate",
          "warrantyEndDate",
          "notes",
          "supplier",
        ].includes(key)
      ) {
        (updateData as any)[key] = (restData as any)[key];
      }
    });

    // Map form fields to Prisma fields
    if (purchaseCost !== undefined) {
      updateData.purchasePrice = purchaseCost;
    }

    // Map notes to description
    if (notes !== undefined) {
      updateData.description = notes;
    }

    // Map supplier to vendorName
    if (supplier !== undefined) {
      updateData.vendorName = supplier;
    }

    // Handle warranty dates - form sends warrantyExpiry but we need start and end dates
    // If warrantyExpiry is provided, use it as the end date and set start date to purchase date
    if (warrantyExpiry) {
      updateData.warrantyStartDate = data.purchaseDate
        ? new Date(data.purchaseDate)
        : new Date();
      updateData.warrantyEndDate = new Date(warrantyExpiry);
    } else {
      // Handle individual warranty start and end dates if provided
      if (warrantyStartDate) {
        updateData.warrantyStartDate = new Date(warrantyStartDate);
      }
      if (warrantyEndDate) {
        updateData.warrantyEndDate = new Date(warrantyEndDate);
      }
    }

    // Handle other date fields
    if (data.purchaseDate) {
      updateData.purchaseDate = new Date(data.purchaseDate);
    }

    // Handle category relation
    if (categoryId) {
      updateData.category = {
        connect: {
          id: categoryId,
        },
      };
    }

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    console.error("Update asset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "inventory.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if asset is currently assigned
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: params.id,
        status: "ASSIGNED",
      },
    });

    if (activeAssignment) {
      return NextResponse.json(
        { message: "Cannot delete asset that is currently assigned" },
        { status: 400 }
      );
    }

    await prisma.asset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("Delete asset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
