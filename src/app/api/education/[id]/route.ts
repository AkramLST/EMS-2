import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH /api/education/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const educationId = params.id;
    if (!educationId) {
      return NextResponse.json({ message: "Education ID is required" }, { status: 400 });
    }

    const existing = await prisma.education.findUnique({ where: { id: educationId } });
    if (!existing) {
      return NextResponse.json({ message: "Education record not found" }, { status: 404 });
    }

    const canEdit =
      user.role === "ADMINISTRATOR" ||
      user.role === "HR_MANAGER" ||
      user.employee?.id === existing.employeeId;

    if (!canEdit) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { institution, degree, major, gpa, startDate, endDate, description } = body || {};

    if (!institution || !degree) {
      return NextResponse.json({ message: "Institution and degree are required" }, { status: 400 });
    }

    const updated = await prisma.education.update({
      where: { id: educationId },
      data: {
        institution,
        degree,
        major: major ?? null,
        gpa: gpa ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description ?? null,
      },
    });

    return NextResponse.json({ education: updated });
  } catch (error) {
    console.error("Update education error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/education/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const educationId = params.id;
    if (!educationId) {
      return NextResponse.json({ message: "Education ID is required" }, { status: 400 });
    }

    const existing = await prisma.education.findUnique({ where: { id: educationId } });
    if (!existing) {
      return NextResponse.json({ message: "Education record not found" }, { status: 404 });
    }

    const canDelete =
      user.role === "ADMINISTRATOR" ||
      user.role === "HR_MANAGER" ||
      user.employee?.id === existing.employeeId;

    if (!canDelete) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    await prisma.education.delete({ where: { id: educationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete education error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
