import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { getClientIpAddress } from "@/lib/ip-utils";
import { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { generateSequentialEmployeeId } from "@/lib/employee-id";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("id");

  // If userId is provided, get specific user
  if (userId) {
    return getUserById(request, userId);
  }

  // Otherwise, get all users with pagination support
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access user management
    if (!hasPermission(user, "user.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get search and filter parameters
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    // Build where clause for filtering
    const whereClause: any = {};

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { employee: { firstName: { contains: search, mode: "insensitive" } } },
        { employee: { lastName: { contains: search, mode: "insensitive" } } },
        { employee: { employeeId: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Add status filtering
    if (status && status !== "ALL") {
      whereClause.employee = {
        ...whereClause.employee,
        status: status,
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          roles: {
            select: {
              role: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              profileImage: true,
              designation: true,
              status: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      }),
    ]);

    // Calculate user statistics based on filtered results
    const totalUsers = total; // Use the actual count from database
    const activeUsers = users.filter(
      (u) => u.employee?.status === "ACTIVE"
    ).length;
    const inactiveUsers = users.filter(
      (u) => u.employee?.status === "INACTIVE"
    ).length;

    // Role distribution
    const roleStats = users.reduce((acc: Record<string, number>, user) => {
      // Count based on the new roles array if available, otherwise use the old role field
      if (user.roles && user.roles.length > 0) {
        user.roles.forEach((userRole) => {
          acc[userRole.role] = (acc[userRole.role] || 0) + 1;
        });
      } else {
        acc[user.role] = (acc[user.role] || 0) + 1;
      }
      return acc;
    }, {});

    return NextResponse.json({
      users,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleStats,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getUserById(request: NextRequest, userId: string) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access user management
    if (!hasPermission(user, "user.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const userDetail = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        roles: {
          select: {
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
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
            employeeId: true,
            profileImage: true,
            designation: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            managerId: true,
            manager: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            employmentType: true,
            workLocation: true,
            joinDate: true,
            probationEndDate: true,
            status: true,
          },
        },
      },
    });

    if (!userDetail) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: userDetail });
  } catch (error) {
    console.error("Get user error:", error);
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

    // Only admins can create users
    if (!hasPermission(user, "user.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { email, password, role, roles, employeeData } = await request.json();

    const normalizeRole = (value: unknown): Role | undefined => {
      if (typeof value !== "string") {
        return undefined;
      }
      const normalized = value.trim().toUpperCase();
      return (Object.values(Role) as string[]).includes(normalized)
        ? (normalized as Role)
        : undefined;
    };

    const resolvePrimaryRole = (
      roleList: Role[] = [],
      fallbackRole?: Role,
      defaultRole: Role = Role.EMPLOYEE
    ): Role => {
      if (
        roleList.includes(Role.ADMINISTRATOR) ||
        fallbackRole === Role.ADMINISTRATOR
      ) {
        return Role.ADMINISTRATOR;
      }
      if (fallbackRole) {
        return fallbackRole;
      }
      if (roleList.length > 0) {
        return roleList[0];
      }
      return defaultRole;
    };

    const normalizedFallbackRole = normalizeRole(role);
    if (role && !normalizedFallbackRole) {
      return NextResponse.json(
        { message: `Invalid role: ${role}` },
        { status: 400 }
      );
    }

    const normalizedRoles: Role[] = [];
    if (Array.isArray(roles)) {
      for (const roleValue of roles) {
        const normalized = normalizeRole(roleValue);
        if (!normalized) {
          return NextResponse.json(
            { message: `Invalid role: ${roleValue}` },
            { status: 400 }
          );
        }
        if (!normalizedRoles.includes(normalized)) {
          normalizedRoles.push(normalized);
        }
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Use default password "employee123" if no password is provided
    const defaultPassword = "employee123";
    const passwordToUse = password || defaultPassword;

    // Hash password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash(passwordToUse, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const primaryRole = resolvePrimaryRole(
        normalizedRoles,
        normalizedFallbackRole
      );
      const roleSet = new Set<Role>(normalizedRoles);
      roleSet.add(primaryRole);
      const rolesToAssign = Array.from(roleSet);

      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          // For backward compatibility, we still set the role field
          role: primaryRole,
          isFirstLogin: true, // Mark as first login
        },
      });

      // Create UserRole entries for assigned roles
      await tx.userRole.createMany({
        data: rolesToAssign.map((roleValue) => ({
          userId: newUser.id,
          role: roleValue,
        })),
        skipDuplicates: true,
      });

      // Create employee if employee data is provided
      let newEmployee = null;
      if (employeeData) {
        // Generate employee ID in the format EMP0001, EMP0002, etc.
        const latestEmployee = await tx.employee.findFirst({
          orderBy: {
            id: "desc",
          },
        });

        let nextEmployeeNumber = 1;
        if (latestEmployee && latestEmployee.employeeId) {
          const latestNumber = parseInt(
            latestEmployee.employeeId.replace("EMP", "")
          );
          if (!isNaN(latestNumber)) {
            nextEmployeeNumber = latestNumber + 1;
          }
        }

        const employeeId = `EMP${nextEmployeeNumber
          .toString()
          .padStart(4, "0")}`;

        // Ensure joinDate is provided and valid
        let joinDate = employeeData.joinDate;
        if (!joinDate) {
          joinDate = new Date();
        } else if (!(joinDate instanceof Date)) {
          joinDate = new Date(joinDate);
        }

        if (isNaN(joinDate.getTime())) {
          joinDate = new Date();
        }

        newEmployee = await tx.employee.create({
          data: {
            ...employeeData,
            employeeId,
            userId: newUser.id,
            email,
            joinDate,
          },
        });
      }

      // Create audit log for creation
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          resource: "user",
          resourceId: newUser.id,
          details:
            `Created user: ${email}` +
            (newEmployee
              ? ` and employee: ${newEmployee.firstName} ${newEmployee.lastName}`
              : ""),
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return { user: newUser, employee: newEmployee };
    });

    return NextResponse.json({
      message: "User created successfully. Default password is 'employee123'.",
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      employee: result.employee,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add DELETE endpoint for user deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete users
    if (!hasPermission(user, "user.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Validate that user ID is provided
    if (!params || !params.id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting the current user
    if (user.id === params.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete user and associated employee record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // First, delete the employee record if it exists
      await tx.employee.deleteMany({
        where: {
          userId: params.id,
        },
      });

      // Then delete the user
      const deletedUser = await tx.user.delete({
        where: {
          id: params.id,
        },
      });

      // Create audit log for deletion
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          resource: "user",
          resourceId: params.id,
          details: `Deleted user: ${deletedUser.email}`,
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return deletedUser;
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2025":
          // Record not found
          return NextResponse.json(
            { message: "User not found or already deleted" },
            { status: 404 }
          );
        case "P2003":
          // Foreign key constraint failed
          return NextResponse.json(
            {
              message:
                "Cannot delete user because it is referenced by other records",
            },
            { status: 400 }
          );
        default:
          console.error(`Prisma error code: ${error.code}`);
          return NextResponse.json(
            {
              message: `Database error occurred: ${error.code}. ${error.message}`,
            },
            { status: 500 }
          );
      }
    }

    // Handle general errors
    if (error instanceof Error) {
      console.error("General error:", error.message);
      return NextResponse.json(
        { message: `Failed to delete user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Failed to delete user. Please try again." },
      { status: 500 }
    );
  }
}

// Add PUT endpoint for user updates
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update users
    if (!hasPermission(user, "user.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id, email, password, role, roles, employeeData } =
      await request.json();

    const resolvePrimaryRole = (
      roleList?: string[] | null,
      fallbackRole?: string | null,
      defaultRole: string = "EMPLOYEE"
    ) => {
      if (roleList && roleList.includes("ADMINISTRATOR")) {
        return "ADMINISTRATOR";
      }
      if (fallbackRole && fallbackRole === "ADMINISTRATOR") {
        return "ADMINISTRATOR";
      }
      if (roleList && roleList.length > 0) {
        const nonEmpty = roleList.find(
          (entry) => entry && entry.trim().length > 0
        );
        if (nonEmpty) {
          return nonEmpty;
        }
      }
      if (fallbackRole && fallbackRole.trim().length > 0) {
        return fallbackRole;
      }
      return defaultRole;
    };

    // Find the existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if email is being changed and if the new email already exists
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Update user and employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const primaryRole = resolvePrimaryRole(
        roles,
        role,
        existingUser.role || "EMPLOYEE"
      );

      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          email,
          ...(password && {
            password: await (
              await import("bcryptjs")
            ).default.hash(password, 10),
          }),
          // For backward compatibility, we still set the role field to the first role
          role: primaryRole,
        },
      });

      // Update UserRole entries for multiple roles
      if (roles && roles.length > 0) {
        // Delete existing user roles
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        // Create new user roles
        await tx.userRole.createMany({
          data: roles.map((role: string) => ({
            userId: id,
            role: role,
          })),
        });
      }

      // Update employee if employee data is provided
      let updatedEmployee = null;
      if (employeeData) {
        // Log the incoming employeeData for debugging
        console.log(
          "Incoming employeeData:",
          JSON.stringify(employeeData, null, 2)
        );

        // Process date fields to handle empty strings
        const processedEmployeeData: any = {
          ...employeeData,
        };

        // Handle relation scalar fields properly
        // For designationId, departmentId, managerId - use relation fields instead of scalar fields
        // Set to null if empty string
        // Handle relation scalar fields properly
        // For designationId, departmentId, managerId - use relation fields instead of scalar fields
        // Set to null if empty string
        if (employeeData.designationId === "") {
          // Don't set designation field at all when designationId is empty
          delete processedEmployeeData.designationId;
        } else if (employeeData.designationId) {
          processedEmployeeData.designation = {
            connect: { id: employeeData.designationId },
          };
          delete processedEmployeeData.designationId;
        }

        if (employeeData.departmentId === "") {
          // Don't set department field at all when departmentId is empty
          delete processedEmployeeData.departmentId;
        } else if (employeeData.departmentId) {
          processedEmployeeData.department = {
            connect: { id: employeeData.departmentId },
          };
          delete processedEmployeeData.departmentId;
        }

        if (employeeData.managerId === "") {
          // Don't set manager field at all when managerId is empty
          delete processedEmployeeData.managerId;
        } else if (employeeData.managerId) {
          processedEmployeeData.manager = {
            connect: { id: employeeData.managerId },
          };
          delete processedEmployeeData.managerId;
        }

        // Handle date fields properly
        if (
          employeeData.dateOfBirth === "" ||
          employeeData.dateOfBirth === null
        ) {
          processedEmployeeData.dateOfBirth = null;
        } else if (employeeData.dateOfBirth) {
          processedEmployeeData.dateOfBirth = new Date(
            employeeData.dateOfBirth
          );
        }

        if (employeeData.joinDate === "" || employeeData.joinDate === null) {
          processedEmployeeData.joinDate = undefined;
        } else if (employeeData.joinDate) {
          processedEmployeeData.joinDate = new Date(employeeData.joinDate);
        }

        if (
          employeeData.probationEndDate === "" ||
          employeeData.probationEndDate === null
        ) {
          processedEmployeeData.probationEndDate = null;
        } else if (employeeData.probationEndDate) {
          processedEmployeeData.probationEndDate = new Date(
            employeeData.probationEndDate
          );
        }

        if (
          employeeData.confirmationDate === "" ||
          employeeData.confirmationDate === null
        ) {
          processedEmployeeData.confirmationDate = null;
        } else if (employeeData.confirmationDate) {
          processedEmployeeData.confirmationDate = new Date(
            employeeData.confirmationDate
          );
        }

        if (
          employeeData.resignationDate === "" ||
          employeeData.resignationDate === null
        ) {
          processedEmployeeData.resignationDate = null;
        } else if (employeeData.resignationDate) {
          processedEmployeeData.resignationDate = new Date(
            employeeData.resignationDate
          );
        }

        if (
          employeeData.lastWorkingDay === "" ||
          employeeData.lastWorkingDay === null
        ) {
          processedEmployeeData.lastWorkingDay = null;
        } else if (employeeData.lastWorkingDay) {
          processedEmployeeData.lastWorkingDay = new Date(
            employeeData.lastWorkingDay
          );
        }

        // Remove empty strings for other optional fields
        Object.keys(processedEmployeeData).forEach((key) => {
          // Skip relation fields as they are handled separately
          if (
            key === "designation" ||
            key === "department" ||
            key === "manager"
          ) {
            return;
          }

          if (processedEmployeeData[key] === "") {
            processedEmployeeData[key] = null;
          }
        });

        // Log the processed data for debugging
        console.log(
          "Processed employeeData:",
          JSON.stringify(processedEmployeeData, null, 2)
        );

        if (existingUser.employee) {
          // Update existing employee
          updatedEmployee = await tx.employee.update({
            where: { userId: id },
            data: processedEmployeeData,
          });
        } else {
          const employeeId = await generateSequentialEmployeeId(tx);

          // Ensure joinDate is provided and valid
          let joinDate = processedEmployeeData.joinDate;
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

          // Add required fields for employee creation
          processedEmployeeData.employeeId = await generateSequentialEmployeeId(
            tx
          );
          processedEmployeeData.userId = id;
          processedEmployeeData.email = email;
          processedEmployeeData.joinDate = joinDate;

          updatedEmployee = await tx.employee.create({
            data: processedEmployeeData,
          });
        }
      }

      // Fetch updated user with roles for response
      const userWithRoles = await tx.user.findUnique({
        where: { id },
        include: {
          roles: {
            select: {
              role: true,
            },
          },
        },
      });

      // Create audit log for update
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE",
          resource: "user",
          resourceId: id,
          details:
            `Updated user: ${email}` +
            (updatedEmployee
              ? ` and employee: ${updatedEmployee.firstName} ${updatedEmployee.lastName}`
              : ""),
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return { user: userWithRoles, employee: updatedEmployee };
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: result.user
        ? {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            roles: result.user.roles,
          }
        : null,
      employee: result.employee,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
