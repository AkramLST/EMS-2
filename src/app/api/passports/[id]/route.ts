import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH /api/passports/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = params.id;
    const body = await request.json();
    const { number, issuedDate, expiryDate, issuingCountry } = body || {};

    const existing = await prisma.passport.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Permission: Admin/HR can edit any; owner can edit own
    if (!(user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER" || user.employee?.id === existing.employeeId)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const updated = await prisma.passport.update({
      where: { id },
      data: {
        ...(number ? { number } : {}),
        ...(issuedDate ? { issuedDate: new Date(issuedDate) } : {}),
        ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        ...(issuingCountry ? { issuingCountry } : {}),
      },
    });

    return NextResponse.json({ passport: updated });
  } catch (error: any) {
    console.error("Update passport error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Passport number already exists for this employee" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/passports/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const id = params.id;
    const existing = await prisma.passport.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (!(user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER" || user.employee?.id === existing.employeeId)) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    await prisma.passport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete passport error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
