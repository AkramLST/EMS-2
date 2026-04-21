import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateSequentialEmployeeId } from "@/lib/employee-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    console.log("[Test User] Creating test user...");

    const testUser = {
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: {
        employee: true,
      },
    });

    if (existingUser) {
      console.log("[Test User] User already exists");

      // Check if user has employee record
      if (!existingUser.employee) {
        console.log(
          "[Test User] User exists but missing employee record, creating..."
        );

        // Get or create default department
        let department = await prisma.department.findFirst({
          where: { name: "General" },
        });

        if (!department) {
          console.log("[Test User] Creating default department...");
          department = await prisma.department.create({
            data: {
              name: "General",
              description: "Default department for new employees",
            },
          });
          console.log("[Test User] Department created:", department.id);
        }

        // Create employee profile for existing user

        // First, create or get a manager for team structure
        let manager = await prisma.employee.findFirst({
          where: { 
            designation: { 
              title: { 
                contains: "Manager" 
              } 
            } 
          },
        });

        if (!manager) {
          console.log("[Test User] Creating test manager for existing user...");
          const hashedPassword = await hashPassword("password123");

          // Create or get manager designation
          let managerDesignation = await prisma.designation.findFirst({
            where: { title: "Department Manager" }
          });

          if (!managerDesignation) {
            managerDesignation = await prisma.designation.create({
              data: {
                title: "Department Manager",
                description: "Department Manager"
              }
            });
          }

          // Create a manager user
          const managerUser = await prisma.user.create({
            data: {
              email: "manager@example.com",
              password: hashedPassword,
              role: "DEPARTMENT_MANAGER",
            },
          });

          // Create manager employee
          manager = await prisma.employee.create({
            data: {
              employeeId: await generateSequentialEmployeeId(),
              userId: managerUser.id,
              firstName: "Test",
              lastName: "Manager",
              email: "manager@example.com",
              designationId: managerDesignation.id,
              departmentId: department.id,
              employmentType: "FULL_TIME",
              joinDate: new Date(),
              status: "ACTIVE",
            },
          });
          console.log("[Test User] Manager created:", manager.id);
        }

        // Create or get employee designation
        let employeeDesignation = await prisma.designation.findFirst({
          where: { title: "Employee" }
        });

        if (!employeeDesignation) {
          employeeDesignation = await prisma.designation.create({
            data: {
              title: "Employee",
              description: "Default employee designation"
            }
          });
        }

        const employee = await prisma.employee.create({
          data: {
            employeeId: await generateSequentialEmployeeId(),
            userId: existingUser.id,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            email: testUser.email,
            designationId: employeeDesignation.id,
            departmentId: department.id,
            managerId: manager.id, // Assign manager
            employmentType: "FULL_TIME",
            joinDate: new Date(),
            status: "ACTIVE",
          },
        });

        console.log(
          "[Test User] Employee record created for existing user:",
          employee.id
        );

        return NextResponse.json({
          message: "Employee record created for existing test user",
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            employee: {
              id: employee.id,
              employeeId: employee.employeeId,
              firstName: employee.firstName,
              lastName: employee.lastName,
            },
          },
        });
      }

      return NextResponse.json({
        message: "Test user already exists with employee record",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          employee: existingUser.employee
            ? {
                id: existingUser.employee.id,
                employeeId: existingUser.employee.employeeId,
                firstName: existingUser.employee.firstName,
                lastName: existingUser.employee.lastName,
              }
            : null,
        },
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(testUser.password);
    console.log("[Test User] Password hashed");

    // Create user and employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log("[Test User] Creating user...");
      // Create user
      const user = await tx.user.create({
        data: {
          email: testUser.email,
          password: hashedPassword,
          role: "EMPLOYEE",
        },
      });
      console.log("[Test User] User created:", user.id);

      // Get or create default department
      let department = await tx.department.findFirst({
        where: { name: "General" },
      });

      if (!department) {
        console.log("[Test User] Creating default department...");
        department = await tx.department.create({
          data: {
            name: "General",
            description: "Default department for new employees",
          },
        });
        console.log("[Test User] Department created:", department.id);
      }

      // Create employee profile
      console.log("[Test User] Creating employee...");

      // First, create or get a manager for team structure
      let manager = await tx.employee.findFirst({
        where: { 
          designation: { 
            title: { 
              contains: "Manager" 
            } 
          } 
        },
      });

      if (!manager) {
        console.log("[Test User] Creating test manager...");
        
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

        // Create a manager user
        const managerUser = await tx.user.create({
          data: {
            email: "manager@example.com",
            password: hashedPassword,
            role: "DEPARTMENT_MANAGER",
          },
        });

        // Create manager employee
        manager = await tx.employee.create({
          data: {
            employeeId: await generateSequentialEmployeeId(tx),
            userId: managerUser.id,
            firstName: "Test",
            lastName: "Manager",
            email: "manager@example.com",
            designationId: managerDesignation.id,
            departmentId: department.id,
            employmentType: "FULL_TIME",
            joinDate: new Date(),
            status: "ACTIVE",
          },
        });
        console.log("[Test User] Manager created:", manager.id);
      }

      // Create or get employee designation
      let employeeDesignation = await tx.designation.findFirst({
        where: { title: "Employee" }
      });

      if (!employeeDesignation) {
        employeeDesignation = await tx.designation.create({
          data: {
            title: "Employee",
            description: "Default employee designation"
          }
        });
      }

      const employee = await tx.employee.create({
        data: {
          employeeId: await generateSequentialEmployeeId(tx),
          userId: user.id,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
          designationId: employeeDesignation.id,
          departmentId: department.id,
          managerId: manager.id, // Assign manager
          employmentType: "FULL_TIME",
          joinDate: new Date(),
          status: "ACTIVE",
        },
      });
      console.log("[Test User] Employee created:", employee.id);

      return { user, employee };
    });

    console.log("[Test User] Transaction completed successfully");

    return NextResponse.json({
      message: "Test user created successfully",
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        employee: {
          id: result.employee.id,
          employeeId: result.employee.employeeId,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
        },
      },
    });
  } catch (error) {
    console.error("[Test User] Error creating test user:", error);
    return NextResponse.json(
      {
        message: "Failed to create test user",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
