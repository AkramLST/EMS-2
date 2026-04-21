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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!workExperienceClient) {
      return NextResponse.json({ message: "Work experience feature is not available" }, { status: 500 });
    }

    const existing = await workExperienceClient.findUnique({
      where: { id: params.id },
      include: workExperienceInclude,
    });

    if (!existing) {
      return NextResponse.json({ message: "Work experience entry not found" }, { status: 404 });
    }

    if (
      !(ADMIN_ROLES.has(user.role) || user.employee?.id === existing.employeeId)
    ) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
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

    const updates: Record<string, any> = {};

    if (typeof title === "string") {
      const trimmed = title.trim();
      if (!trimmed) {
        return NextResponse.json({ message: "Role / title cannot be empty" }, { status: 400 });
      }
      updates.title = trimmed;
    }

    if (typeof companyName === "string") {
      updates.companyName = companyName.trim() || null;
    }

    if (typeof location === "string") {
      updates.location = location.trim() || null;
    }

    if (employmentType !== undefined) {
      updates.employmentType = normalizeEmploymentType(employmentType);
    }

    if (changeReason !== undefined) {
      updates.changeReason = typeof changeReason === "string" && changeReason.trim().length > 0 ? changeReason.trim() : null;
    }

    if (description !== undefined) {
      updates.description = typeof description === "string" && description.trim().length > 0 ? description.trim() : null;
    }

    if (startDate !== undefined) {
      if (!startDate) {
        return NextResponse.json({ message: "Start date is required" }, { status: 400 });
      }
      const parsed = new Date(startDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ message: "Invalid start date" }, { status: 400 });
      }
      updates.startDate = parsed;
    }

    if (isCurrent === true) {
      updates.endDate = null;
    } else if (endDate !== undefined) {
      if (!endDate) {
        updates.endDate = null;
      } else {
        const parsed = new Date(endDate);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ message: "Invalid end date" }, { status: 400 });
        }
        if (updates.startDate && parsed < updates.startDate) {
          return NextResponse.json({ message: "End date cannot be before start date" }, { status: 400 });
        }
        updates.endDate = parsed;
      }
    }

    const updated = await workExperienceClient.update({
      where: { id: params.id },
      data: updates,
      include: workExperienceInclude,
    });

    return NextResponse.json({ workExperience: mapExperienceRecord(updated) });
  } catch (error) {
    console.error("Update work experience error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!workExperienceClient) {
      return NextResponse.json({ message: "Work experience feature is not available" }, { status: 500 });
    }

    const existing = await workExperienceClient.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Work experience entry not found" }, { status: 404 });
    }

    if (
      !(ADMIN_ROLES.has(user.role) || user.employee?.id === existing.employeeId)
    ) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    await workExperienceClient.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete work experience error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
