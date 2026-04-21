import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = ["ADMINISTRATOR", "HR_MANAGER"];
const EMPLOYEE_EDITABLE_FIELDS = [
  "phone",
  "alternatePhone",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "nationality",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
  "fatherName",
  "cnic",
  "bloodGroup",
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "emergencyContactEmail",
  "emergencyContactAddressLine1",
  "emergencyContactAddressLine2",
  "emergencyContactCity",
  "emergencyContactState",
  "emergencyContactPostalCode",
];
const ADMIN_EDITABLE_FIELDS = [
  "employeeId",
  "firstName",
  "lastName",
  "middleName",
  ...EMPLOYEE_EDITABLE_FIELDS,
];

async function buildProfileResponse(targetEmployeeId: string) {
  const employeeData = (await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    include: {
      department: true,
      designation: true,
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: {
            select: {
              title: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          role: true,
          sessions: {
            where: {
              isActive: true,
            },
            orderBy: {
              lastActivity: "desc",
            },
            take: 1,
            select: {
              status: true,
              lastActivity: true,
            },
          },
        },
      },
      documents: {
        orderBy: {
          uploadedAt: "desc",
        },
      },
      leaveBalances: {
        include: {
          leaveType: true,
        },
      },
      leaveApplications: {
        orderBy: {
          startDate: "asc",
        },
        include: {
          leaveType: {
            select: {
              name: true,
            },
          },
        },
      },
      attendanceRecords: {
        orderBy: {
          date: "desc",
        },
        take: 30,
      },
      educationRecords: {
        orderBy: {
          startDate: "desc",
        },
      },
      workExperiences: {
        orderBy: {
          startDate: "desc",
        },
        include: {
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
        },
      },
      jobHistory: {
        orderBy: {
          startDate: "desc",
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          designation: {
            select: {
              id: true,
              title: true,
            },
          },
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
        },
      },
      emergencyContacts: {
        orderBy: {
          createdAt: "asc",
        },
      },
      certifications: {
        orderBy: {
          issueDate: "desc",
        },
      },
    },
  } as any)) as any;

  if (!employeeData) {
    return null;
  }

  const jobHistoryRecords: any[] = Array.isArray(employeeData.jobHistory)
    ? employeeData.jobHistory
    : [];

  const workExperienceRecords: any[] = Array.isArray(
    employeeData.workExperiences
  )
    ? employeeData.workExperiences
    : [];

  const leaveBalances: any[] = Array.isArray(employeeData.leaveBalances)
    ? employeeData.leaveBalances
    : [];

  const leaveBalanceSummary = leaveBalances.reduce<Record<string, any>>(
    (acc, balance) => {
      const typeName = balance.leaveType?.name ?? "Unknown";
      acc[typeName] = {
        allocated: balance.allocated,
        used: balance.used,
        remaining: balance.remaining,
        carryForward: balance.carryForward,
      };
      return acc;
    },
    {}
  );

  const attendanceRecords: any[] = Array.isArray(employeeData.attendanceRecords)
    ? employeeData.attendanceRecords
    : [];
  const leaveApplications: any[] = Array.isArray(employeeData.leaveApplications)
    ? employeeData.leaveApplications
    : [];
  const emergencyContacts: any[] = Array.isArray(employeeData.emergencyContacts)
    ? employeeData.emergencyContacts
    : [];
  const certifications: any[] = Array.isArray(employeeData.certifications)
    ? employeeData.certifications
    : [];

  const now = new Date();
  const upcomingTimeOff = leaveApplications
    .filter((application) => {
      if (!application.startDate) return false;
      const start = new Date(application.startDate);
      return (
        start >= now &&
        ["APPROVED", "PENDING"].includes(
          String(application.status || "").toUpperCase()
        )
      );
    })
    .map((application) => ({
      id: application.id,
      leaveType: application.leaveType?.name ?? "Leave",
      status: application.status,
      startDate: application.startDate,
      endDate: application.endDate,
      totalDays: application.totalDays,
      reason: application.reason,
    }));

  const leaveHistoryEntries = leaveApplications
    .map((application) => ({
      id: application.id,
      leaveType: application.leaveType?.name ?? "Leave",
      status: application.status,
      startDate: application.startDate,
      endDate: application.endDate,
      totalDays: application.totalDays,
      reason: application.reason,
      approvedBy: application.approvedBy,
      approvedAt: application.approvedAt,
      createdAt:
        application.appliedAt ?? application.createdAt ?? application.startDate,
    }))
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const attendanceStats = {
    totalDays: attendanceRecords.length,
    presentDays: attendanceRecords.filter((r) =>
      ["PRESENT", "ON_TIME"].includes(r.status)
    ).length,
    lateDays: attendanceRecords.filter((r) => r.status === "LATE").length,
    absentDays: attendanceRecords.filter((r) => r.status === "ABSENT").length,
    averageHours:
      attendanceRecords.length > 0
        ? attendanceRecords.reduce(
            (sum, r) => sum + Number(r.totalHours || 0),
            0
          ) / attendanceRecords.length
        : 0,
  };

  const recentActivities = attendanceRecords
    .slice(0, 5)
    .map((record) => ({
      type: "ATTENDANCE",
      date: record.createdAt,
      description: `Attendance recorded: ${record.status}`,
      status: record.status,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const normalizedEmergencyContacts = emergencyContacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    relation: contact.relation,
    phone: contact.phone,
    email: contact.email,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    createdAt: contact.createdAt?.toISOString?.() ?? contact.createdAt,
    updatedAt: contact.updatedAt?.toISOString?.() ?? contact.updatedAt,
    isLegacy: false,
  }));

  const hasLegacyContact =
    employeeData.emergencyContactName ||
    employeeData.emergencyContactRelation ||
    employeeData.emergencyContactPhone ||
    employeeData.emergencyContactEmail ||
    employeeData.emergencyContactAddressLine1 ||
    employeeData.emergencyContactAddressLine2 ||
    employeeData.emergencyContactCity ||
    employeeData.emergencyContactState ||
    employeeData.emergencyContactPostalCode;

  if (!normalizedEmergencyContacts.length && hasLegacyContact) {
    normalizedEmergencyContacts.push({
      id: `legacy-${employeeData.id}`,
      name: employeeData.emergencyContactName ?? "",
      relation: employeeData.emergencyContactRelation ?? "",
      phone: employeeData.emergencyContactPhone ?? "",
      email: employeeData.emergencyContactEmail ?? null,
      addressLine1: employeeData.emergencyContactAddressLine1 ?? null,
      addressLine2: employeeData.emergencyContactAddressLine2 ?? null,
      city: employeeData.emergencyContactCity ?? null,
      state: employeeData.emergencyContactState ?? null,
      postalCode: employeeData.emergencyContactPostalCode ?? null,
      createdAt: employeeData.updatedAt,
      updatedAt: employeeData.updatedAt,
      isLegacy: true,
    });
  }

  return {
    ...employeeData,
    leaveBalanceSummary,
    attendanceStats,
    recentActivities,
    upcomingTimeOff,
    leaveHistory: leaveHistoryEntries,
    emergencyContacts: normalizedEmergencyContacts,
    fullName: `${employeeData.firstName} ${employeeData.middleName || ""} ${
      employeeData.lastName
    }`.trim(),
    age: employeeData.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(employeeData.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null,
    socialLinks: {
      linkedin: employeeData.linkedin || null,
      twitter: employeeData.twitter || null,
      facebook: employeeData.facebook || null,
      instagram: employeeData.instagram || null,
    },
    education: (Array.isArray(employeeData.educationRecords)
      ? employeeData.educationRecords
      : []
    ).map((record: any) => ({
      id: record.id,
      institution: record.institution,
      degree: record.degree,
      major: record.major,
      gpa: record.gpa,
      startDate: record.startDate,
      endDate: record.endDate,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })),
    jobHistory: jobHistoryRecords.map((history: any) => ({
      id: history.id,
      title: history.title,
      departmentId: history.departmentId,
      departmentName: history.department?.name ?? null,
      managerId: history.managerId,
      managerName: history.manager
        ? `${history.manager.firstName} ${history.manager.lastName}`.trim()
        : null,
      startDate: history.startDate,
      endDate: history.endDate,
      changeReason: history.changeReason,
      createdById: history.createdById,
      createdByName: history.createdBy?.employee
        ? `${history.createdBy.employee.firstName} ${history.createdBy.employee.lastName}`.trim()
        : null,
      createdAt: history.createdAt,
      designationId: history.designationId ?? null,
      designationTitle: history.designation?.title ?? null,
      employmentType: history.employmentType ?? null,
    })),
    workExperiences: workExperienceRecords.map((experience: any) => ({
      id: experience.id,
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
    })),
    certifications: certifications.map((cert: any) => ({
      id: cert.id,
      title: cert.title,
      issuedBy: cert.issuedBy ?? null,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      status: cert.status,
      verificationUrl: cert.verificationUrl ?? null,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
    })),
    passports: [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedEmployeeId = searchParams.get("id");

    let targetEmployeeId: string;

    if (requestedEmployeeId) {
      const canViewOtherProfiles =
        user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.role === "DEPARTMENT_MANAGER";

      if (!canViewOtherProfiles && user.employee?.id !== requestedEmployeeId) {
        return NextResponse.json(
          {
            message:
              "Access denied. You do not have permission to view this profile.",
          },
          { status: 403 }
        );
      }
      targetEmployeeId = requestedEmployeeId;
    } else {
      if (!user.employee) {
        return NextResponse.json(
          { message: "Employee profile not found" },
          { status: 404 }
        );
      }
      targetEmployeeId = user.employee.id;
    }

    const profileData = await buildProfileResponse(targetEmployeeId);

    if (!profileData) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profileData,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch profile data",
        error:
          process.env.NODE_ENV === "development"
            ? (error as Error)?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { employeeId: requestedEmployeeId, updates } = body;
    const targetEmployeeId = requestedEmployeeId || user.employee?.id;

    if (!targetEmployeeId) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    const isAdminOrHr = ADMIN_ROLES.includes(user.role);
    const isSelf = user.employee?.id === targetEmployeeId;

    if (!isSelf && !isAdminOrHr) {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to update this profile.",
        },
        { status: 403 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { message: "Updates payload is required" },
        { status: 400 }
      );
    }

    const allowedFields = isAdminOrHr
      ? ADMIN_EDITABLE_FIELDS
      : EMPLOYEE_EDITABLE_FIELDS;

    // If employeeId is being changed, validate it's unique
    if (updates.employeeId && updates.employeeId !== targetEmployeeId) {
      const existingEmployee = await prisma.employee.findFirst({
        where: {
          employeeId: updates.employeeId,
          id: {
            not: targetEmployeeId,
          },
        },
      });

      if (existingEmployee) {
        return NextResponse.json(
          { message: "This Employee ID is already in use" },
          { status: 400 }
        );
      }

      // Only administrators can change employee ID
      if (user.role !== "ADMINISTRATOR") {
        return NextResponse.json(
          { message: "Only administrators can change Employee ID" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        let value = updates[field];
        if (value === undefined) continue;
        if (typeof value === "string") {
          value = value.trim();
        }
        if (field === "dateOfBirth") {
          if (!value) {
            updateData[field] = null;
          } else {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              return NextResponse.json(
                { message: "Invalid date format for dateOfBirth" },
                { status: 400 }
              );
            }
            updateData[field] = dateValue;
          }
        } else if (field === "gender") {
          if (!value) {
            updateData[field] = null;
          } else {
            const normalized = String(value).toUpperCase();
            updateData[field] = normalized;
          }
        } else if (field === "maritalStatus") {
          if (!value) {
            updateData[field] = null;
          } else {
            const normalized = String(value).toUpperCase();
            updateData[field] = normalized;
          }
        } else {
          updateData[field] = value === "" ? null : value;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          message: "No editable fields provided for update",
        },
        { status: 400 }
      );
    }

    await prisma.employee.update({
      where: { id: targetEmployeeId },
      data: updateData,
    });

    const profileData = await buildProfileResponse(targetEmployeeId);

    return NextResponse.json({
      success: true,
      profile: profileData,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        message: "Failed to update profile",
        error:
          process.env.NODE_ENV === "development"
            ? (error as Error)?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
