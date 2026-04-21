import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { month, year } = await request.json()

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructure: true,
        attendanceRecords: {
          where: {
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1)
            }
          }
        }
      }
    })

    // Calculate payroll for each employee
    const payrollData = employees.map(employee => {
      const workingDays = employee.attendanceRecords.filter(
        record => record.status === 'PRESENT'
      ).length

      const baseSalary = employee.salaryStructure?.basicSalary || 50000
      const grossSalary = employee.salaryStructure?.grossSalary || 60000
      
      // Calculate deductions (simplified)
      const tax = Number(grossSalary) * 0.1 // 10% tax
      const pf = Number(baseSalary) * 0.12 // 12% PF
      const totalDeductions = tax + pf
      
      const netSalary = Number(grossSalary) - totalDeductions

      return {
        employeeId: employee.id,
        month,
        year,
        workingDays,
        baseSalary: Number(baseSalary),
        grossSalary: Number(grossSalary),
        deductions: totalDeductions,
        netSalary,
        status: 'GENERATED'
      }
    })

    return NextResponse.json({ 
      message: 'Payroll generated successfully',
      processed: payrollData.length,
      totalAmount: payrollData.reduce((sum, p) => sum + p.netSalary, 0)
    })
  } catch (error) {
    console.error('Generate payroll error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
