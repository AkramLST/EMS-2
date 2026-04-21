import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMPLOYMENT_TYPE_VALUES = new Set([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
]);

const normalizeEmploymentType = (value?: string | null) => {
  if (!value) return null;
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
  return EMPLOYMENT_TYPE_VALUES.has(normalized) ? normalized : null;
};

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

// PATCH /api/job-history/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.jobHistory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Work experience entry not found" }, { status: 404 });
    }

    if (
      !(
        user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.employee?.id === existing.employeeId
      )
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

    const updates: any = {};

    if (typeof title === "string") {
      updates.title = title.trim();
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

    const updated = await prisma.jobHistory.update({
      where: { id: params.id },
      data: updates,
      include: jobHistoryInclude,
    });

    return NextResponse.json({ jobHistory: mapHistoryRecord(updated) });
  } catch (error) {
    console.error("Update job history error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/job-history/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.jobHistory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Work experience entry not found" }, { status: 404 });
    }

    if (
      !(
        user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.employee?.id === existing.employeeId
      )
    ) {
      return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
    }

    await prisma.jobHistory.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete job history error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
