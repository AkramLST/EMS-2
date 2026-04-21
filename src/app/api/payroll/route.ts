import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // For now, return mock data since we don't have payroll records table yet
    // In a real implementation, you would query actual payroll records
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructure: true
      }
    })

    const records = employees.map(employee => ({
      id: `payroll-${employee.id}-${month}-${year}`,
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId
      },
      salaryStructure: employee.salaryStructure ? {
        name: employee.salaryStructure.name,
        basicSalary: Number(employee.salaryStructure.basicSalary),
        grossSalary: Number(employee.salaryStructure.grossSalary),
        netSalary: Number(employee.salaryStructure.netSalary)
      } : {
        name: 'Standard Package',
        basicSalary: 50000,
        grossSalary: 60000,
        netSalary: 45000
      },
      month: month || new Date().getMonth() + 1,
      year: parseInt(year || new Date().getFullYear().toString()),
      status: 'GENERATED',
      generatedAt: new Date().toISOString()
    }))

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Get payroll error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
