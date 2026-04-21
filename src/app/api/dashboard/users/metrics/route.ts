import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface UserWithCreatedDate {
  createdAt: Date;
}

export async function GET() {
  try {
    // Get total users
    const totalUsers = await prisma.user.count();

    // Get active users (users with employee status = ACTIVE)
    const activeUsers = await prisma.user.count({
      where: {
        employee: {
          status: 'ACTIVE',
        },
      },
    });

    // Get inactive users (users with employee status = INACTIVE)
    const inactiveUsers = await prisma.user.count({
      where: {
        employee: {
          status: 'INACTIVE',
        },
      },
    });

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate user growth percentage (current month vs previous month)
    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setDate(0); // Last day of previous month

    const startOfLastMonth = new Date(endOfLastMonth);
    startOfLastMonth.setDate(1);

    const previousMonthCount = await prisma.user.count({
      where: {
        createdAt: {
          lt: startOfMonth,
          gte: startOfLastMonth
        }
      }
    });

    const growthPercentage = previousMonthCount > 0
      ? ((newUsers - previousMonthCount) / previousMonthCount) * 100
      : newUsers > 0 ? 100 : 0; // Handle zero division and new company cases

    // Get average account age in days
    const usersWithCreatedDate = await prisma.user.findMany({
      select: {
        createdAt: true,
      },
    });

    const avgAccountAgeInMs = usersWithCreatedDate.length > 0
      ? usersWithCreatedDate.reduce((sum: number, user: UserWithCreatedDate) => {
          return sum + (new Date().getTime() - new Date(user.createdAt).getTime());
        }, 0) / usersWithCreatedDate.length
      : 0;

    const avgAccountAge = Math.round((avgAccountAgeInMs / (1000 * 60 * 60 * 24)) * 10) / 10;

    // Get users by role distribution
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsers,
      avgAccountAge,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      usersByRole: usersByRole.map(role => ({
        role: role.role,
        count: role._count.role
      })),
      roleDistribution: {
        administrators: usersByRole.find(r => r.role === 'ADMINISTRATOR')?._count.role || 0,
        hrManagers: usersByRole.find(r => r.role === 'HR_MANAGER')?._count.role || 0,
        departmentManagers: usersByRole.find(r => r.role === 'DEPARTMENT_MANAGER')?._count.role || 0,
        employees: usersByRole.find(r => r.role === 'EMPLOYEE')?._count.role || 0,
        payrollOfficers: usersByRole.find(r => r.role === 'PAYROLL_OFFICER')?._count.role || 0,
        systemAuditors: usersByRole.find(r => r.role === 'SYSTEM_AUDITOR')?._count.role || 0,
      }
    });
  } catch (error) {
    console.error('Failed to fetch user metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
