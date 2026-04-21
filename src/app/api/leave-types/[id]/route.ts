import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const leaveType = await prisma.leaveType.update({
      where: { id: params.id },
      data: {
        ...data,
        maxDaysPerYear: parseInt(data.maxDaysPerYear),
      },
    });

    return NextResponse.json({ leaveType });
  } catch (error) {
    console.error("Update leave type error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [leaveRequestCount, leaveBalanceCount] = await Promise.all([
      prisma.leaveApplication.count({
        where: { leaveTypeId: params.id },
      }),
      prisma.leaveBalance.count({
        where: { leaveTypeId: params.id },
      }),
    ]);

    if (leaveRequestCount > 0 || leaveBalanceCount > 0) {
      const blockingEntities: string[] = [];
      if (leaveRequestCount > 0) {
        blockingEntities.push("existing leave requests");
      }
      if (leaveBalanceCount > 0) {
        blockingEntities.push("leave balance records");
      }

      const message = `Cannot delete leave type because it is referenced by ${blockingEntities.join(
        " and "
      )}.`;

      return NextResponse.json({ message }, { status: 400 });
    }

    await prisma.leaveType.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Leave type deleted successfully" });
  } catch (error) {
    console.error("Delete leave type error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
