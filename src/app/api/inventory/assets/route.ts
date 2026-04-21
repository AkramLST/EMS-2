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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { assetCode: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: true,
          assignments: {
            where: { status: "ASSIGNED" },
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeId: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);

    // Map Prisma model fields to form fields for the frontend
    const assetsForForm = assets.map((asset) => {
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

      return {
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
    });

    return NextResponse.json({
      assets: assetsForForm,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
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

    if (!hasPermission(user, "inventory.create")) {
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

    // Generate asset code if not provided
    let assetCode = data.assetCode;
    if (!assetCode) {
      const category = await prisma.assetCategory.findUnique({
        where: { id: categoryId },
      });
      const count = await prisma.asset.count();
      assetCode = `${category?.name.substring(0, 3).toUpperCase()}-${String(
        count + 1
      ).padStart(4, "0")}`;
    }

    // Handle date fields and field mappings
    const createData: any = { assetCode };

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
        (createData as any)[key] = (restData as any)[key];
      }
    });

    // Map form fields to Prisma fields
    if (purchaseCost !== undefined) {
      createData.purchasePrice = purchaseCost;
    }

    // Map notes to description
    if (notes !== undefined) {
      createData.description = notes;
    }

    // Map supplier to vendorName
    if (supplier !== undefined) {
      createData.vendorName = supplier;
    }

    // Handle warranty dates - form sends warrantyExpiry but we need start and end dates
    // If warrantyExpiry is provided, use it as the end date and set start date to purchase date
    if (warrantyExpiry) {
      createData.warrantyStartDate = data.purchaseDate
        ? new Date(data.purchaseDate)
        : new Date();
      createData.warrantyEndDate = new Date(warrantyExpiry);
    } else {
      // Handle individual warranty start and end dates if provided
      if (warrantyStartDate) {
        createData.warrantyStartDate = new Date(warrantyStartDate);
      }
      if (warrantyEndDate) {
        createData.warrantyEndDate = new Date(warrantyEndDate);
      }
    }

    // Handle other date fields
    if (data.purchaseDate) {
      createData.purchaseDate = new Date(data.purchaseDate);
    }

    // Handle category relation
    if (categoryId) {
      createData.category = {
        connect: {
          id: categoryId,
        },
      };
    }

    const asset = await prisma.asset.create({
      data: createData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    console.error("Create asset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
