import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get department distribution
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: {
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
    });

    const departmentData = departments
      .filter((dept) => dept._count.employees > 0)
      .map((dept) => ({
        name: dept.name,
        count: dept._count.employees,
      }));

    return NextResponse.json({
      departments: departmentData,
    });
  } catch (error) {
    console.error("Get department chart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
