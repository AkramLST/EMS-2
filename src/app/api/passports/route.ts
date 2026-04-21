import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/passports?employeeId=optional
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");

    let employeeId: string | null = null;

    if (employeeIdParam) {
      // Only ADMIN/HR can read others by arbitrary employeeId
      if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
        employeeId = employeeIdParam;
      } else if (user.employee?.id === employeeIdParam) {
        employeeId = employeeIdParam;
      } else {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
      }
    } else {
      // Default to own
      employeeId = user.employee?.id || null;
    }

    if (!employeeId) {
      return NextResponse.json({ passports: [] });
    }

    const passports = await prisma.passport.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ passports });
  } catch (error) {
    console.error("Get passports error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST /api/passports
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { employeeId: employeeIdBody, number, issuedDate, expiryDate, issuingCountry } = body || {};

    // Who are we creating for?
    let targetEmployeeId = user.employee?.id || null;

    if (employeeIdBody) {
      if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
        targetEmployeeId = employeeIdBody;
      } else if (user.employee?.id === employeeIdBody) {
        targetEmployeeId = employeeIdBody;
      } else {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
      }
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ message: "Employee not found" }, { status: 400 });
    }

    if (!number || !issuedDate || !expiryDate || !issuingCountry) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const created = await prisma.passport.create({
      data: {
        employeeId: targetEmployeeId,
        number,
        issuedDate: new Date(issuedDate),
        expiryDate: new Date(expiryDate),
        issuingCountry,
      },
    });

    return NextResponse.json({ passport: created }, { status: 201 });
  } catch (error: any) {
    console.error("Create passport error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Passport number already exists for this employee" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
