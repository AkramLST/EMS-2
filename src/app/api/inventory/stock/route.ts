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

    if (!hasPermission(user.role, "inventory.manage_stock")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lowStock = searchParams.get("lowStock") === "true";

    const where: any = {};

    if (lowStock) {
      where.currentStock = {
        lte: prisma.stockItem.fields.reorderLevel,
      };
    }

    const stockItems = await prisma.stockItem.findMany({
      where,
      include: {
        category: true,
        stockMovements: {
          orderBy: { performedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ stockItems });
  } catch (error) {
    console.error("Get stock items error:", error);
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

    if (!hasPermission(user.role, "inventory.manage_stock")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Generate item code if not provided
    let itemCode = data.itemCode;
    if (!itemCode) {
      const count = await prisma.stockItem.count();
      itemCode = `STK-${String(count + 1).padStart(4, "0")}`;
    }

    const stockItem = await prisma.stockItem.create({
      data: {
        ...data,
        itemCode,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      message: "Stock item created successfully",
      stockItem,
    });
  } catch (error) {
    console.error("Create stock item error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
