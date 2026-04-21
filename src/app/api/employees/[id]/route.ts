import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hasJobChangeOccurred, logJobHistoryEntry } from "@/lib/job-history";
import { getClientIpAddress } from "@/lib/ip-utils";
import { canAssignRole, getRoleDisplayName } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict department managers and employees from accessing employee details
    if (user.role === "DEPARTMENT_MANAGER" || user.role === "EMPLOYEE") {
      // Allow employees to view their own profile by checking the user's employee record ID against the requested param ID
      if (user.employee?.id !== params.id) {
        return NextResponse.json(
          {
            message:
              "Access denied. You do not have permission to view this employee's details.",
          },
          { status: 403 }
        );
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            id: true,
            role: true,
            roles: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Get employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict department managers and employees from editing employees
    if (user.role === "DEPARTMENT_MANAGER" || user.role === "EMPLOYEE") {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to edit employee details. Contact HR or Administrator.",
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        designation: true,
        department: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Prepare update data - only include allowed fields
    const allowedFields = [
      "firstName",
      "lastName",
      "middleName",
      "employeeId",
      "dateOfBirth",
      "gender",
      "maritalStatus",
      "nationality",
      "email",
      "phone",
      "alternatePhone",
      "address",
      "city",
      "state",
      "country",
      "postalCode",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelation",
      "designationId",
      "departmentId",
      "managerId",
      "employmentType",
      "workLocation",
      "joinDate",
      "probationEndDate",
      "confirmationDate",
      "resignationDate",
      "lastWorkingDay",
      "status",
    ];

    const updateData: any = {};

    // Only include allowed fields
    allowedFields.forEach((field) => {
      if (data.hasOwnProperty(field)) {
        updateData[field] = data[field];
      }
    });

    // Handle date conversions with validation
    const dateFields = [
      "joinDate",
      "dateOfBirth",
      "probationEndDate",
      "confirmationDate",
      "resignationDate",
      "lastWorkingDay",
    ];

    for (const field of dateFields) {
      if (updateData[field] !== undefined) {
        if (updateData[field] === null || updateData[field] === "") {
          // Handle null/empty values for optional date fields
          if (field !== "joinDate") {
            // joinDate is required
            updateData[field] = null;
          } else {
            delete updateData[field]; // Don't update required field with null
          }
        } else {
          // Validate and convert date
          const dateValue = new Date(updateData[field]);
          if (isNaN(dateValue.getTime())) {
            return NextResponse.json(
              { message: `Invalid date format for ${field}` },
              { status: 400 }
            );
          }
          updateData[field] = dateValue;
        }
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // If employeeId is being changed, enforce admin-only and uniqueness/format
    if (
      updateData.employeeId !== undefined &&
      updateData.employeeId !== existingEmployee.employeeId
    ) {
      // Only administrators are allowed to change employee IDs
      if (user.role !== "ADMINISTRATOR") {
        return NextResponse.json(
          {
            message:
              "Access denied. Only administrators can change Employee IDs.",
          },
          { status: 403 }
        );
      }

      const newEmployeeId: string = String(updateData.employeeId).trim();

      // Validate format: EMP followed by exactly 4 digits
      if (!/^EMP\d{4}$/.test(newEmployeeId)) {
        return NextResponse.json(
          {
            message:
              "Invalid Employee ID format. It must be in the form EMP#### (4 digits).",
          },
          { status: 400 }
        );
      }

      // Ensure uniqueness (no other employee has this ID)
      const existingIdHolder = await prisma.employee.findFirst({
        where: {
          employeeId: newEmployeeId,
          id: {
            not: params.id,
          },
        },
        select: { id: true },
      });

      if (existingIdHolder) {
        return NextResponse.json(
          { message: "This Employee ID is already in use" },
          { status: 409 }
        );
      }
    }

    // Handle enum fields - convert empty strings to null
    const enumFields = ["gender", "maritalStatus"];
    for (const field of enumFields) {
      if (updateData[field] !== undefined) {
        if (updateData[field] === "") {
          updateData[field] = null;
        }
      }
    }

    // Handle managerId field - convert empty string to null
    if (updateData.managerId !== undefined) {
      if (updateData.managerId === "") {
        updateData.managerId = null;
      }
    }

    const jobEffectiveDateRaw = data.jobEffectiveDate;
    let jobEffectiveDate: Date | undefined;
    if (jobEffectiveDateRaw) {
      const parsed = new Date(jobEffectiveDateRaw);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { message: "Invalid date format for jobEffectiveDate" },
          { status: 400 }
        );
      }
      jobEffectiveDate = parsed;
    }

    const jobChangeReason =
      typeof data.jobChangeReason === "string" &&
      data.jobChangeReason.trim().length > 0
        ? data.jobChangeReason.trim()
        : null;

    const formatEmploymentLabel = (type?: string | null) => {
      if (!type) return null;
      return type
        .split("_")
        .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
        .join(" ");
    };

    const jobChanged = hasJobChangeOccurred({
      currentDesignationId: existingEmployee.designationId,
      nextDesignationId:
        updateData.designationId !== undefined
          ? updateData.designationId
          : existingEmployee.designationId,
      currentDepartmentId: existingEmployee.departmentId,
      nextDepartmentId:
        updateData.departmentId !== undefined
          ? updateData.departmentId
          : existingEmployee.departmentId,
      currentManagerId: existingEmployee.managerId ?? null,
      nextManagerId:
        updateData.managerId !== undefined
          ? updateData.managerId
          : existingEmployee.managerId ?? null,
      currentEmploymentType: existingEmployee.employmentType,
      nextEmploymentType:
        updateData.employmentType !== undefined
          ? updateData.employmentType
          : existingEmployee.employmentType,
      currentWorkLocation: existingEmployee.workLocation ?? null,
      nextWorkLocation:
        updateData.workLocation !== undefined
          ? updateData.workLocation
          : existingEmployee.workLocation ?? null,
    });

    const normalizedRole =
      typeof data.role === "string" && data.role.trim().length > 0
        ? data.role.trim().toUpperCase()
        : undefined;

    const targetRole: Role | undefined = normalizedRole
      ? (Object.values(Role) as string[]).includes(normalizedRole)
        ? (normalizedRole as Role)
        : undefined
      : undefined;

    if (normalizedRole && !targetRole) {
      return NextResponse.json(
        { message: `Invalid role: ${normalizedRole}` },
        { status: 400 }
      );
    }

    const existingRoles = existingEmployee.user?.roles || [];
    const existingPrimaryRole = existingEmployee.user?.role
      ? existingEmployee.user.role
      : existingRoles.length > 0
      ? existingRoles[0].role
      : "EMPLOYEE";

    if (
      targetRole &&
      targetRole !== existingPrimaryRole &&
      existingEmployee.user
    ) {
      if (!hasPermission(user, "user.assign_roles")) {
        return NextResponse.json(
          { message: "Insufficient permissions to assign roles" },
          { status: 403 }
        );
      }

      if (!canAssignRole(user.role, targetRole)) {
        return NextResponse.json(
          {
            message: `You don't have permission to assign the role: ${getRoleDisplayName(
              targetRole
            )}`,
          },
          { status: 403 }
        );
      }
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employee.update({
        where: { id: params.id },
        data: updateData,
        include: {
          department: true,
          designation: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (
        targetRole &&
        targetRole !== existingPrimaryRole &&
        existingEmployee.user
      ) {
        await tx.user.update({
          where: { id: existingEmployee.user.id },
          data: { role: targetRole },
        });

        await tx.userRole.deleteMany({
          where: { userId: existingEmployee.user.id },
        });

        await tx.userRole.create({
          data: {
            userId: existingEmployee.user.id,
            role: targetRole,
          },
        });
      }

      if (jobChanged) {
        const changeDetails: string[] = [];

        const oldDesignationTitle = existingEmployee.designation?.title ?? null;
        const newDesignationTitle =
          typeof updatedEmployee.designation === "object" &&
          updatedEmployee.designation
            ? updatedEmployee.designation.title
            : null;

        if (
          oldDesignationTitle &&
          newDesignationTitle &&
          oldDesignationTitle !== newDesignationTitle
        ) {
          changeDetails.push(
            `Designation updated: ${oldDesignationTitle} → ${newDesignationTitle}`
          );
        }

        const oldEmploymentType = formatEmploymentLabel(
          existingEmployee.employmentType ?? null
        );
        const newEmploymentType = formatEmploymentLabel(
          updatedEmployee.employmentType ?? null
        );
        if (
          oldEmploymentType &&
          newEmploymentType &&
          oldEmploymentType !== newEmploymentType
        ) {
          changeDetails.push(
            `Employment type changed: ${oldEmploymentType} → ${newEmploymentType}`
          );
        }

        const oldDepartmentName = existingEmployee.department?.name ?? null;
        const newDepartmentName = updatedEmployee.department?.name ?? null;
        if (
          oldDepartmentName &&
          newDepartmentName &&
          oldDepartmentName !== newDepartmentName
        ) {
          changeDetails.push(
            `Department moved: ${oldDepartmentName} → ${newDepartmentName}`
          );
        }

        const oldManagerName = existingEmployee.manager
          ? `${existingEmployee.manager.firstName} ${existingEmployee.manager.lastName}`.trim()
          : null;
        const newManagerName = updatedEmployee.manager
          ? `${updatedEmployee.manager.firstName} ${updatedEmployee.manager.lastName}`.trim()
          : null;
        if (
          oldManagerName &&
          newManagerName &&
          oldManagerName !== newManagerName
        ) {
          changeDetails.push(
            `Reporting manager changed: ${oldManagerName} → ${newManagerName}`
          );
        }

        const computedReason =
          jobChangeReason ??
          (changeDetails.length > 0 ? changeDetails.join(" | ") : null);

        await logJobHistoryEntry(tx, {
          employeeId: updatedEmployee.id,
          title:
            typeof updatedEmployee.designation === "object" &&
            updatedEmployee.designation
              ? updatedEmployee.designation.title
              : updatedEmployee.designationId,
          departmentId: updatedEmployee.departmentId,
          managerId: updatedEmployee.managerId ?? null,
          designationId: updatedEmployee.designationId,
          employmentType: updatedEmployee.employmentType,
          startDate: jobEffectiveDate,
          changeReason: computedReason,
          createdById: user.id,
        });
      }

      return updatedEmployee;
    });

    // Create audit log for update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        resource: "employee",
        resourceId: params.id,
        details: `Updated employee: ${data.firstName} ${data.lastName}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Update employee error:", error);
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

    // Restrict department managers and employees from deleting employees
    if (user.role === "DEPARTMENT_MANAGER" || user.role === "EMPLOYEE") {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to delete employees. Contact HR or Administrator.",
        },
        { status: 403 }
      );
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: true, // Include user to get the userId
      },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        resource: "employee",
        resourceId: params.id,
        details: `Deleted employee: ${existingEmployee.firstName} ${existingEmployee.lastName}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Delete both employee and associated user in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete the employee first
      await tx.employee.delete({
        where: { id: params.id },
      });

      // Then delete the associated user
      await tx.user.delete({
        where: { id: existingEmployee.userId },
      });
    });

    return NextResponse.json({
      message: "Employee and associated user deleted successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
