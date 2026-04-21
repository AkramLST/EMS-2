import { NextRequest, NextResponse } from "next/server";
import { EmploymentType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["ADMINISTRATOR", "HR_MANAGER"]);

const EMPLOYMENT_TYPE_VALUES = new Set<EmploymentType>([
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.CONTRACT,
  EmploymentType.INTERN,
]);

const normalizeEmploymentType = (value?: string | null): EmploymentType | null => {
  if (!value) return null;
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
  const possible = normalized as EmploymentType;
  return EMPLOYMENT_TYPE_VALUES.has(possible) ? possible : null;
};

const mapHistoryRecord = (history: any) => ({
  id: history.id,
  employeeId: history.employeeId,
  title: history.title,
  companyName: history.companyName ?? null,
  location: history.location ?? null,
  departmentId: history.departmentId ?? null,
  departmentName: history.department?.name ?? null,
  managerId: history.managerId ?? null,
  managerName: history.manager
    ? `${history.manager.firstName} ${history.manager.lastName}`.trim()
    : null,
  designationId: history.designationId ?? null,
  designationTitle: history.designation?.title ?? null,
  employmentType: history.employmentType ?? null,
  startDate: history.startDate,
  endDate: history.endDate,
  changeReason: history.changeReason ?? null,
  description: history.description ?? null,
  createdById: history.createdById ?? null,
  createdByName: history.createdBy?.employee
    ? `${history.createdBy.employee.firstName} ${history.createdBy.employee.lastName}`.trim()
    : null,
  createdAt: history.createdAt,
  updatedAt: history.updatedAt,
});

const jobHistoryInclude = {
  department: true,
  manager: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  designation: true,
  createdBy: {
    select: {
      id: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
};

// GET /api/job-history?employeeId=
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");

    let targetEmployeeId: string | null = null;

    if (employeeIdParam) {
      if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
        targetEmployeeId = employeeIdParam;
      } else if (user.employee?.id === employeeIdParam) {
        targetEmployeeId = employeeIdParam;
      } else {
        return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
      }
    } else {
      targetEmployeeId = user.employee?.id ?? null;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ jobHistory: [] });
    }

    const records = await prisma.jobHistory.findMany({
      where: { employeeId: targetEmployeeId },
      include: jobHistoryInclude,
      orderBy: [
        { startDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ jobHistory: records.map(mapHistoryRecord) });
  } catch (error) {
    console.error("Get job history error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST /api/job-history
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(user.role)) {
      return NextResponse.json(
        { message: "Only HR administrators can modify job history" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId: employeeIdBody,
      title,
      companyName,
      location,
      employmentType,
      startDate,
      endDate,
      isCurrent,
      changeReason,
      description,
    } = body || {};

    if (!employeeIdBody) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const targetEmployeeId = employeeIdBody;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ message: "Role / title is required" }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ message: "Start date is required" }, { status: 400 });
    }

    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      return NextResponse.json({ message: "Invalid start date" }, { status: 400 });
    }

    let parsedEnd: Date | null = null;
    if (!isCurrent && endDate) {
      parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ message: "Invalid end date" }, { status: 400 });
      }
      if (parsedEnd < parsedStart) {
        return NextResponse.json({ message: "End date cannot be before start date" }, { status: 400 });
      }
    }

    const employmentTypeValue = normalizeEmploymentType(employmentType);

    const created = await prisma.jobHistory.create({
      data: {
        employeeId: targetEmployeeId,
        title: title.trim(),
        companyName: companyName?.trim() || null,
        location: location?.trim() || null,
        employmentType: employmentTypeValue,
        startDate: parsedStart,
        endDate: isCurrent ? null : parsedEnd,
        changeReason: changeReason?.trim() || null,
        description: description?.trim() || null,
        createdById: user.id,
      },
      include: jobHistoryInclude,
    });

    return NextResponse.json({ jobHistoryEntry: mapHistoryRecord(created) }, { status: 201 });
  } catch (error) {
    console.error("Create job history error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
