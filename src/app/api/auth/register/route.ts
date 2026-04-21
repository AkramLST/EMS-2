import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateSequentialEmployeeId } from "@/lib/employee-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, role } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists with this email" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          // For backward compatibility, we still set the role field
          role: role || "EMPLOYEE",
        },
      });

      // Create UserRole entry
      await tx.userRole.create({
        data: {
          userId: user.id,
          role: role || "EMPLOYEE",
        },
      });

      // Get or create default department
      let department = await tx.department.findFirst({
        where: { name: "General" },
      });

      if (!department) {
        department = await tx.department.create({
          data: {
            name: "General",
            description: "Default department for new employees",
          },
        });
      }

      // Get or create default designation
      let designation = await tx.designation.findFirst({
        where: { title: "Employee" },
      });

      if (!designation) {
        designation = await tx.designation.create({
          data: {
            title: "Employee",
            description: "Default designation for new employees",
          },
        });
      }

      // Create employee profile
      const employee = await tx.employee.create({
        data: {
          employeeId: await generateSequentialEmployeeId(tx),
          userId: user.id,
          firstName,
          lastName,
          email,
          designationId: designation.id,
          departmentId: department.id,
          employmentType: "FULL_TIME",
          joinDate: new Date(),
          status: "ACTIVE",
        },
      });

      return { user, employee };
    });

    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
