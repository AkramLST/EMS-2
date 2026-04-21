import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Get current stock item
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: data.stockItemId },
    });

    if (!stockItem) {
      return NextResponse.json(
        { message: "Stock item not found" },
        { status: 404 }
      );
    }

    const previousStock = stockItem.currentStock;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (data.type) {
      case "STOCK_IN":
        newStock = previousStock + data.quantity;
        break;
      case "STOCK_OUT":
        newStock = previousStock - data.quantity;
        break;
      case "ADJUSTMENT":
        newStock = data.quantity; // Direct adjustment to specified quantity
        break;
      case "DAMAGED":
      case "EXPIRED":
        newStock = previousStock - data.quantity;
        break;
      default:
        return NextResponse.json(
          { message: "Invalid movement type" },
          { status: 400 }
        );
    }

    if (newStock < 0) {
      return NextResponse.json(
        { message: "Insufficient stock for this operation" },
        { status: 400 }
      );
    }

    // Create movement and update stock in transaction
    const movement = await prisma.$transaction(async (tx) => {
      const stockMovement = await tx.stockMovement.create({
        data: {
          stockItemId: data.stockItemId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          referenceNumber: data.referenceNumber,
          previousStock,
          newStock,
          performedBy: user.id,
        },
        include: {
          stockItem: {
            include: {
              category: true,
            },
          },
        },
      });

      await tx.stockItem.update({
        where: { id: data.stockItemId },
        data: { currentStock: newStock },
      });

      return stockMovement;
    });

    return NextResponse.json({
      message: "Stock movement recorded successfully",
      movement,
    });
  } catch (error) {
    console.error("Create stock movement error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
