import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["ADMINISTRATOR", "HR_MANAGER"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const designationId = params?.id;

    if (!designationId) {
      return NextResponse.json(
        { error: "Designation ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const existingDesignation = await prisma.designation.findFirst({
      where: {
        title: {
          equals: title,
          mode: "insensitive",
        },
        NOT: {
          id: designationId,
        },
      },
    });

    if (existingDesignation) {
      return NextResponse.json(
        { error: "Designation with this title already exists" },
        { status: 400 }
      );
    }

    const designation = await prisma.designation.update({
      where: { id: designationId },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(designation);
  } catch (error) {
    console.error("Failed to update designation:", error);
    return NextResponse.json(
      { error: "Failed to update designation" },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const designationId = params?.id;

    if (!designationId) {
      return NextResponse.json(
        { error: "Designation ID is required" },
        { status: 400 }
      );
    }

    const employeeCount = await prisma.employee.count({
      where: {
        designationId,
      },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete designation because it is assigned to employees",
        },
        { status: 400 }
      );
    }

    await prisma.designation.delete({
      where: { id: designationId },
    });

    return NextResponse.json({ message: "Designation deleted successfully" });
  } catch (error) {
    console.error("Failed to delete designation:", error);
    return NextResponse.json(
      { error: "Failed to delete designation" },
      { status: 500 }
    );
  }
}
