import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Check last 7 days of attendance data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const attendanceData = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 100 // Limit to 100 records for testing
    });

    const employeeCount = await prisma.employee.count({
      where: { status: 'ACTIVE' }
    });

    return NextResponse.json({
      employeeCount,
      attendanceRecords: attendanceData.length,
      sampleRecords: attendanceData.slice(0, 5), // Show first 5 records
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch attendance data', details: error },
      { status: 500 }
    );
  }
}
