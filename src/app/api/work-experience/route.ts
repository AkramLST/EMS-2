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

const workExperienceClient = (prisma as any).workExperience;

const workExperienceInclude = {
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

const mapExperienceRecord = (experience: any) => ({
  id: experience.id,
  employeeId: experience.employeeId,
  title: experience.title,
  companyName: experience.companyName ?? null,
  location: experience.location ?? null,
  employmentType: experience.employmentType ?? null,
  startDate: experience.startDate,
  endDate: experience.endDate,
  changeReason: experience.changeReason ?? null,
  description: experience.description ?? null,
  createdById: experience.createdById ?? null,
  createdByName: experience.createdBy?.employee
    ? `${experience.createdBy.employee.firstName} ${experience.createdBy.employee.lastName}`.trim()
    : null,
  createdAt: experience.createdAt,
  updatedAt: experience.updatedAt,
  isCurrent: !experience.endDate,
});

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
      if (ADMIN_ROLES.has(user.role)) {
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
      return NextResponse.json({ workExperiences: [] });
    }

    if (!workExperienceClient) {
      return NextResponse.json({ message: "Work experience feature is not available" }, { status: 500 });
    }

    const records = await workExperienceClient.findMany({
      where: { employeeId: targetEmployeeId },
      include: workExperienceInclude,
      orderBy: [
        { startDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ workExperiences: records.map(mapExperienceRecord) });
  } catch (error) {
    console.error("Get work experience error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

    let targetEmployeeId = user.employee?.id ?? null;

    if (employeeIdBody) {
      if (ADMIN_ROLES.has(user.role)) {
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
    if (isCurrent === false && endDate) {
      parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ message: "Invalid end date" }, { status: 400 });
      }
      if (parsedEnd < parsedStart) {
        return NextResponse.json({ message: "End date cannot be before start date" }, { status: 400 });
      }
    }

    const employmentTypeValue = normalizeEmploymentType(employmentType);

    if (!workExperienceClient) {
      return NextResponse.json({ message: "Work experience feature is not available" }, { status: 500 });
    }

    const created = await workExperienceClient.create({
      data: {
        employeeId: targetEmployeeId,
        title: title.trim(),
        companyName: companyName?.trim() || null,
        location: location?.trim() || null,
        employmentType: employmentTypeValue,
        startDate: parsedStart,
        endDate: isCurrent === false ? parsedEnd : null,
        changeReason: changeReason?.trim() || null,
        description: description?.trim() || null,
        createdById: user.id,
      },
      include: workExperienceInclude,
    });

    return NextResponse.json(
      { workExperience: mapExperienceRecord(created) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create work experience error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
