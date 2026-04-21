import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "leave.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const currentYear = new Date().getFullYear();

    // Determine which employee's balance to fetch
    let targetEmployeeId = user.employee.id;

    if (
      employeeId &&
      (hasPermission(user, "leave.read_all") ||
        hasPermission(user, "leave.approve"))
    ) {
      targetEmployeeId = employeeId;
    } else if (employeeId && hasPermission(user, "leave.approve_team")) {
      // Department managers can only view their team members' balances
      const teamMember = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          managerId: user.employee.id,
        },
      });

      if (teamMember) {
        targetEmployeeId = employeeId;
      }
    }

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: targetEmployeeId,
        year: currentYear,
      },
      include: {
        leaveType: true,
      },
      orderBy: {
        leaveType: {
          name: "asc",
        },
      },
    });

    // If no balances exist, create default ones based on leave types
    if (balances.length === 0) {
      const leaveTypes = await prisma.leaveType.findMany();

      const defaultBalances = await Promise.all(
        leaveTypes.map(async (leaveType) => {
          const balance = await prisma.leaveBalance.create({
            data: {
              employeeId: targetEmployeeId,
              leaveTypeId: leaveType.id,
              year: currentYear,
              allocated: leaveType.maxDaysPerYear,
              used: 0,
              remaining: leaveType.maxDaysPerYear,
              carryForward: 0,
            },
            include: {
              leaveType: true,
            },
          });
          return balance;
        })
      );

      return NextResponse.json({ balances: defaultBalances });
    }

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("Get leave balances error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
