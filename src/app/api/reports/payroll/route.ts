import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Restrict access to non-employee roles only
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if user has permission to view payroll reports
    if (!hasPermission(user, "payroll.read_all") && !hasPermission(user, "payroll.read")) {
      console.log("Payroll report access denied for user:", {
        userId: user.id,
        userRole: user.role,
        hasPayrollReadAll: hasPermission(user, "payroll.read_all"),
        hasPayrollRead: hasPermission(user, "payroll.read"),
        requiredPermissions: ["payroll.read_all", "payroll.read"]
      });
      return NextResponse.json(
        { message: "Insufficient permissions to access payroll reports" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Test database connection and table existence
    try {
      const testQuery = await prisma.salaryStructure.findFirst();
      console.log("Salary structures table exists, sample record:", testQuery ? "Found" : "Empty table");
    } catch (dbError) {
      console.error("Database connection or table issue:", dbError);
      return NextResponse.json(
        { message: "Database connection error", error: dbError instanceof Error ? dbError.message : "Unknown database error" },
        { status: 500 }
      );
    }

    // Get user's department for filtering
    const userDepartmentId = user.employee?.departmentId;

    // Check if user is DEPARTMENT_MANAGER - if so, filter by their department
    const isDepartmentManager = user.role === "DEPARTMENT_MANAGER";
    const departmentFilter = isDepartmentManager && userDepartmentId ? { departmentId: userDepartmentId } : {};

    console.log("Payroll report API called with:", {
      userRole: user.role,
      userDepartmentId: user.employee?.departmentId,
      isDepartmentManager,
      departmentFilter,
    });

    // Get salary structures and calculate payroll (filtered for department managers)
    const salaryStructures = await prisma.salaryStructure.findMany({
      include: {
        employees: {
          where: {
            status: "ACTIVE",
            ...departmentFilter,
          },
          include: {
            department: true,
          },
        },
      },
    });

    let totalPayroll = 0;
    let totalEmployees = 0;
    const departmentPayroll: {
      [key: string]: { totalAmount: number; employeeCount: number };
    } = {};

    salaryStructures.forEach((salary) => {
      salary.employees.forEach((employee) => {
        const netSalary = parseFloat(salary.netSalary.toString());
        totalPayroll += netSalary;
        totalEmployees += 1;

        const deptName = employee.department.name;
        if (!departmentPayroll[deptName]) {
          departmentPayroll[deptName] = { totalAmount: 0, employeeCount: 0 };
        }
        departmentPayroll[deptName].totalAmount += netSalary;
        departmentPayroll[deptName].employeeCount += 1;
      });
    });

    const averageSalary =
      totalEmployees > 0 ? totalPayroll / totalEmployees : 0;

    const departmentPayrollArray = Object.entries(departmentPayroll).map(
      ([name, data]) => ({
        name,
        totalAmount: data.totalAmount,
        employeeCount: data.employeeCount,
      })
    );

    const payrollReport = {
      totalPayroll,
      totalEmployees,
      averageSalary,
      recordsProcessed: totalEmployees,
    };

    return NextResponse.json({
      payrollReport,
      departmentPayroll: departmentPayrollArray,
      debug: {
        userRole: user.role,
        userDepartmentId: user.employee?.departmentId,
        isDepartmentManager,
        departmentFilter,
      }
    });
  } catch (error) {
    console.error("Get payroll report error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
