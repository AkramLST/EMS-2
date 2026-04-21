import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateSequentialEmployeeId } from "@/lib/employee-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("[Setup Team] Setting up test team structure...");

    // Check if manager already exists
    let manager = await prisma.employee.findFirst({
      where: { designation: { title: { contains: "Manager" } } },
      include: { designation: true },
    });

    if (!manager) {
      console.log("[Setup Team] Creating manager...");

      // Get or create default department
      let department = await prisma.department.findFirst({
        where: { name: "General" },
      });

      if (!department) {
        console.log("[Setup Team] Creating default department...");
        department = await prisma.department.create({
          data: {
            name: "General",
            description: "Default department for new employees",
          },
        });
      }

      const hashedPassword = await hashPassword("password123");

      // Create manager in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create manager user
        const managerUser = await tx.user.create({
          data: {
            email: "manager@example.com",
            password: hashedPassword,
            role: "DEPARTMENT_MANAGER",
          },
        });

        // Create or get manager designation
        let managerDesignation = await tx.designation.findFirst({
          where: { title: "Department Manager" }
        });

        if (!managerDesignation) {
          managerDesignation = await tx.designation.create({
            data: {
              title: "Department Manager",
              description: "Department Manager"
            }
          });
        }

        // Create manager employee
        const managerEmployee = await tx.employee.create({
          data: {
            employeeId: await generateSequentialEmployeeId(tx),
            userId: managerUser.id,
            firstName: "John",
            lastName: "Manager",
            email: "manager@example.com",
            designationId: managerDesignation.id,
            departmentId: department.id,
            employmentType: "FULL_TIME",
            joinDate: new Date(),
            status: "ACTIVE",
          },
        });

        // Create a couple more team members
        const member1User = await tx.user.create({
          data: {
            email: "alice@example.com",
            password: hashedPassword,
            role: "EMPLOYEE",
          },
        });

        // Create or get senior developer designation
        let seniorDevDesignation = await tx.designation.findFirst({
          where: { title: "Senior Developer" }
        });

        if (!seniorDevDesignation) {
          seniorDevDesignation = await tx.designation.create({
            data: {
              title: "Senior Developer",
              description: "Senior Developer"
            }
          });
        }

        const member1 = await tx.employee.create({
          data: {
            employeeId: await generateSequentialEmployeeId(tx),
            userId: member1User.id,
            firstName: "Alice",
            lastName: "Smith",
            email: "alice@example.com",
            designationId: seniorDevDesignation.id,
            departmentId: department.id,
            managerId: managerEmployee.id,
            employmentType: "FULL_TIME",
            joinDate: new Date(),
            status: "ACTIVE",
          },
        });

        const member2User = await tx.user.create({
          data: {
            email: "bob@example.com",
            password: hashedPassword,
            role: "EMPLOYEE",
          },
        });

        // Create or get frontend developer designation
        let frontendDevDesignation = await tx.designation.findFirst({
          where: { title: "Frontend Developer" }
        });

        if (!frontendDevDesignation) {
          frontendDevDesignation = await tx.designation.create({
            data: {
              title: "Frontend Developer",
              description: "Frontend Developer"
            }
          });
        }

        const member2 = await tx.employee.create({
          data: {
            employeeId: await generateSequentialEmployeeId(tx),
            userId: member2User.id,
            firstName: "Bob",
            lastName: "Johnson",
            email: "bob@example.com",
            designationId: frontendDevDesignation.id,
            departmentId: department.id,
            managerId: managerEmployee.id,
            employmentType: "FULL_TIME",
            joinDate: new Date(),
            status: "ACTIVE",
          },
        });

        return { managerEmployee, member1, member2 };
      });

      // Fetch the manager with designation relation
      manager = await prisma.employee.findUnique({
        where: { id: result.managerEmployee.id },
        include: { designation: true },
      });
      console.log("[Setup Team] Manager created:", manager?.id);
    }

    // Update test user to have the manager
    const testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
      include: { employee: true },
    });

    if (testUser && testUser.employee && manager) {
      await prisma.employee.update({
        where: { id: testUser.employee.id },
        data: { managerId: manager.id },
      });
      console.log("[Setup Team] Test user assigned to manager");
    }

    if (!manager) {
      throw new Error("Manager not found or created");
    }

    return NextResponse.json({
      message: "Team structure created successfully",
      manager: {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        designation: manager.designation.title,
      },
    });
  } catch (error) {
    console.error("[Setup Team] Error:", error);
    return NextResponse.json(
      {
        message: "Failed to setup team",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
