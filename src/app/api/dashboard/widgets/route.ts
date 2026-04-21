import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const role = request.nextUrl.searchParams.get("role");

    const userWidgets = await prisma.userWidget.findMany({
      where: { userId: decoded.userId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ widgets: userWidgets });
  } catch (error) {
    console.error("Failed to fetch widgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch widgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { widgets } = await request.json();

    // Delete existing widgets for user
    await prisma.userWidget.deleteMany({
      where: { userId: decoded.userId },
    });

    // Create new widget configuration
    const widgetData = widgets.map((widget: any, index: number) => ({
      userId: decoded.userId,
      widgetId: widget.id,
      widgetType: widget.type,
      title: widget.title,
      size: widget.size,
      visible: widget.visible,
      position: index,
      config: JSON.stringify(widget.config),
    }));

    await prisma.userWidget.createMany({
      data: widgetData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save widgets:", error);
    return NextResponse.json(
      { error: "Failed to save widgets" },
      { status: 500 }
    );
  }
}
