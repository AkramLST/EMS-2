import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/education?employeeId=
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");

    let employeeId: string | null = null;

    if (employeeIdParam) {
      if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
        employeeId = employeeIdParam;
      } else if (user.employee?.id === employeeIdParam) {
        employeeId = employeeIdParam;
      } else {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
      }
    } else {
      employeeId = user.employee?.id || null;
    }

    if (!employeeId) {
      return NextResponse.json({ educations: [] });
    }

    const educations = await prisma.education.findMany({
      where: { employeeId },
      orderBy: [
        { startDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ educations });
  } catch (error) {
    console.error("Get education error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST /api/education
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId: employeeIdBody, institution, degree, major, gpa, startDate, endDate, description } = body || {};

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

    if (!institution || !degree) {
      return NextResponse.json({ message: "Institution and degree are required" }, { status: 400 });
    }

    const created = await prisma.education.create({
      data: {
        employeeId: targetEmployeeId,
        institution,
        degree,
        major: major || null,
        gpa: gpa || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
      },
    });

    return NextResponse.json({ education: created }, { status: 201 });
  } catch (error) {
    console.error("Create education error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
