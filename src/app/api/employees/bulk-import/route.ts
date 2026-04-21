import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employees } = await request.json();

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { message: "Employees array is required" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each employee
    for (const employeeData of employees) {
      try {
        // Validate required fields
        if (!employeeData.firstName || !employeeData.lastName || !employeeData.email) {
          results.failed++;
          results.errors.push(`Missing required fields for employee: ${employeeData.email || 'unknown'}`);
          continue;
        }

        // Check if employee already exists
        const existingEmployee = await prisma.employee.findUnique({
          where: { email: employeeData.email }
        });

        if (existingEmployee) {
          results.failed++;
          results.errors.push(`Employee with email ${employeeData.email} already exists`);
          continue;
        }

        // Generate employee ID if not provided
        const employeeId = employeeData.employeeId || `EMP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Get or create designation
        let designation = await prisma.designation.findFirst({
          where: { title: employeeData.designation || 'Employee' }
        });

        if (!designation) {
          designation = await prisma.designation.create({
            data: {
              title: employeeData.designation || 'Employee',
              description: `${employeeData.designation || 'Employee'} designation`
            }
          });
        }

        // Set default values
        const cleanEmployeeData = {
          employeeId,
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          middleName: employeeData.middleName || null,
          email: employeeData.email,
          phone: employeeData.phone || null,
          designationId: designation.id,
          departmentId: employeeData.departmentId || null,
          employmentType: employeeData.employmentType || 'FULL_TIME',
          joinDate: employeeData.joinDate ? new Date(employeeData.joinDate) : new Date(),
          status: employeeData.status || 'ACTIVE',
          // Handle optional fields
          alternatePhone: employeeData.alternatePhone || null,
          dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null,
          gender: employeeData.gender || null,
          maritalStatus: employeeData.maritalStatus || null,
          nationality: employeeData.nationality || null,
          address: employeeData.address || null,
          city: employeeData.city || null,
          state: employeeData.state || null,
          country: employeeData.country || null,
          postalCode: employeeData.postalCode || null,
          emergencyContactName: employeeData.emergencyContactName || null,
          emergencyContactPhone: employeeData.emergencyContactPhone || null,
          emergencyContactRelation: employeeData.emergencyContactRelation || null,
          workLocation: employeeData.workLocation || null,
          managerId: employeeData.managerId || null,
          probationEndDate: employeeData.probationEndDate ? new Date(employeeData.probationEndDate) : null
        };

        // Create user account first
        const userData = {
          email: employeeData.email,
          password: 'temp123', // Temporary password - should be changed on first login
          role: 'EMPLOYEE' as const
        };

        const newUser = await prisma.user.create({
          data: userData
        });

        // Create employee record
        await prisma.employee.create({
          data: {
            ...cleanEmployeeData,
            userId: newUser.id
          }
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'CREATE',
            resource: 'employee',
            resourceId: employeeId,
            details: `Bulk import: ${employeeData.firstName} ${employeeData.lastName}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        });

        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import ${employeeData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.imported} imported, ${results.failed} failed.`,
      ...results
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
