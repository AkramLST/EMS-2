import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  emailTemplates,
  generateResetToken,
  createResetLink,
} from "@/lib/email";
import { generateSequentialEmployeeId } from "@/lib/employee-id";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getClientIpAddress } from "@/lib/ip-utils";
import { canAssignRole, getRoleDisplayName } from "@/lib/permissions";

// Disable caching for this route to always get fresh data
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict department managers and employees from accessing employee management
    if ( user.role === "EMPLOYEE") {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to access employee management.",
          employees: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unassigned = searchParams.get("unassigned");
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause based on filters
    let whereClause: any = {};

    if (unassigned === "true") {
      whereClause.departmentId = null;
    }

    if (department) {
      whereClause.departmentId = department;
    }

    // Special handling for manager role filter
    if (role === "manager") {
      // Find employees who are managers or have management roles
      whereClause.OR = [
        {
          user: {
            role: {
              in: ["DEPARTMENT_MANAGER", "HR_MANAGER", "ADMINISTRATOR"],
            },
          },
        },
        {
          designation: {
            contains: "Manager",
            mode: "insensitive",
          },
        },
      ];
    }

    // Add search filter
    if (search) {
      const searchConditions = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          employeeId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];

      if (whereClause.OR) {
        // If there's already an OR condition, combine with search conditions
        whereClause.OR = [...whereClause.OR, ...searchConditions];
      } else {
        // If no existing OR condition, set search conditions
        whereClause.OR = searchConditions;
      }
    }

    // Add status filter
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          middleName: true,
          email: true,
          phone: true,
          alternatePhone: true,
          dateOfBirth: true,
          gender: true,
          maritalStatus: true,
          nationality: true,
          address: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          employmentType: true,
          workLocation: true,
          joinDate: true,
          probationEndDate: true,
          status: true,
          profileImage: true, // Include profile image
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          designation: {
            select: {
              id: true,
              title: true,
            },
          },
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
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.employee.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict department managers and employees from creating employees
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to create employees. Contact HR or Administrator.",
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName) {
      return NextResponse.json(
        { message: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Check if user has permission to assign roles
    // If a role other than EMPLOYEE is specified, user must have user.assign_roles permission
    if (
      data.role &&
      data.role !== "EMPLOYEE" &&
      !hasPermission(user, "user.assign_roles")
    ) {
      return NextResponse.json(
        { message: "Insufficient permissions to assign roles" },
        { status: 403 }
      );
    }

    // Check if the user can assign this specific role
    if (
      data.role &&
      data.role !== "EMPLOYEE" &&
      !canAssignRole(user.role, data.role)
    ) {
      return NextResponse.json(
        {
          message: `You don't have permission to assign the role: ${getRoleDisplayName(
            data.role
          )}`,
        },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    // Also check if employee email exists (double check)
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: data.email },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { message: "An employee with this email already exists" },
        { status: 409 }
      );
    }

    // Use transaction to ensure both User and Employee are created together
    // Keep only database operations inside the transaction to avoid long-running
    // work (like sending emails) that can cause transaction timeouts (P2028).

    // Create user account for the employee with default password
    const defaultPassword = "employee123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Generate reset token for first-time login (outside transaction so we can
    // also use it after commit when sending email)
    const resetToken = generateResetToken();
    const resetTokenExp = new Date();
    resetTokenExp.setHours(resetTokenExp.getHours() + 24); // Token expires in 24 hours

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: data.role || "EMPLOYEE", // Use role from data or default to EMPLOYEE
          isFirstLogin: true,
          resetToken: resetToken,
          resetTokenExp: resetTokenExp,
        },
      });

      // Generate employee ID in the format EMP0001, EMP0002, etc.
      // Get the latest employee ID and increment it
      const employeeId = await generateSequentialEmployeeId(tx);

      // Ensure joinDate is provided and valid
      let joinDate = data.joinDate;
      if (!joinDate) {
        // If no joinDate provided, use today's date
        joinDate = new Date();
      } else if (!(joinDate instanceof Date)) {
        // If joinDate is not a Date object, try to convert it
        joinDate = new Date(joinDate);
      }

      // Validate that joinDate is a valid date
      if (isNaN(joinDate.getTime())) {
        joinDate = new Date(); // Fallback to today's date if invalid
      }

      // Prepare employee data
      const employeeData = {
        employeeId, // Use the generated employee ID
        userId: newUser.id,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        email: data.email,
        phone: data.phone || null,
        alternatePhone: data.alternatePhone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        maritalStatus: data.maritalStatus || null,
        nationality: data.nationality || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContactRelation: data.emergencyContactRelation || null,
        designationId: data.designationId,
        departmentId: data.departmentId,
        managerId: data.managerId || null,
        employmentType: data.employmentType,
        workLocation: data.workLocation || null,
        joinDate, // Use the validated joinDate
        probationEndDate: data.probationEndDate
          ? new Date(data.probationEndDate)
          : null,
        status: data.status || "ACTIVE",
      };

      const employee = await tx.employee.create({
        data: employeeData,
        include: {
          department: true,
          manager: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create audit log for creation
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          resource: "employee",
          resourceId: employee.id,
          details: `Created employee: ${data.firstName} ${data.lastName}`,
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return employee;
    });

    // Send welcome email to the new employee *after* the transaction commits
    try {
      console.log("Attempting to send welcome email to:", data.email);
      const fullName = `${data.firstName} ${data.lastName}`;
      const resetLink = createResetLink(resetToken, true);
      const emailTemplate = emailTemplates.welcomeUser(
        fullName,
        resetLink,
        process.env.COMPANY_NAME
      );

      const emailResult = await sendEmail({
        to: data.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      console.log("Email sending result:", emailResult);
      if (!emailResult) {
        console.error("Failed to send welcome email to:", data.email);
      }
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the entire operation if email sending fails
    }

    return NextResponse.json({
      employee: result,
      message:
        "Employee created successfully. A welcome email with setup instructions has been sent to the employee.",
    });
  } catch (error) {
    console.error("Create employee error:", error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint failed
        if (
          error.meta?.target &&
          Array.isArray(error.meta.target) &&
          error.meta.target.includes("email")
        ) {
          return NextResponse.json(
            { message: "An employee with this email already exists" },
            { status: 409 }
          );
        }
      }
    }

    return NextResponse.json(
      { message: "Failed to create employee. Please try again." },
      { status: 500 }
    );
  }
}
