import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const query = request.nextUrl.searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const searchResults: SearchResult[] = [];

    interface SearchResult {
      id: string;
      title: string;
      subtitle: string;
      type:
        | "employee"
        | "department"
        | "leave"
        | "announcement"
        | "report"
        | "holiday"
        | "training"
        | "asset"
        | "payroll";
      url: string;
    }

    // Search employees
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { employeeId: { contains: query, mode: "insensitive" } },
          { designation: { title: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { department: true, designation: true },
      take: 10,
    });

    employees.forEach((emp) => {
      searchResults.push({
        id: emp.id,
        title: `${emp.firstName} ${emp.lastName}`,
        subtitle: `${emp.designation.title} - ${
          emp.department?.name || "No Department"
        }`,
        type: "employee",
        url: `/dashboard/employees/${emp.id}`,
      });
    });

    // Search departments
    const departments = await prisma.department.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    departments.forEach((dept) => {
      searchResults.push({
        id: dept.id,
        title: dept.name,
        subtitle: `Department - ${dept.description || "No description"}`,
        type: "department",
        url: `/dashboard/departments/${dept.id}`,
      });
    });

    // Search leave requests
    const leaves = await prisma.leaveApplication.findMany({
      where: {
        reason: { contains: query, mode: "insensitive" },
      },
      include: { employee: true },
      take: 5,
    });

    leaves.forEach((leave: any) => {
      searchResults.push({
        id: leave.id,
        title: `Leave Request`,
        subtitle: `${leave.employee.firstName} ${leave.employee.lastName} - ${leave.reason}`,
        type: "leave",
        url: `/dashboard/leave/${leave.id}`,
      });
    });

    // Search announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { author: true },
      take: 5,
    });

    announcements.forEach((announcement: any) => {
      searchResults.push({
        id: announcement.id,
        title: announcement.title,
        subtitle: `Announcement - ${announcement.author?.employee?.firstName} ${announcement.author?.employee?.lastName}`,
        type: "announcement",
        url: `/dashboard/announcements/${announcement.id}`,
      });
    });

    // Search holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    holidays.forEach((holiday: any) => {
      searchResults.push({
        id: holiday.id,
        title: holiday.name,
        subtitle: `Holiday - ${holiday.description || "No description"}`,
        type: "holiday",
        url: `/dashboard/holidays/${holiday.id}`,
      });
    });

    // Search training programs
    const trainings = await prisma.trainingProgram.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    trainings.forEach((training: any) => {
      searchResults.push({
        id: training.id,
        title: training.title,
        subtitle: `Training - ${training.description || "No description"}`,
        type: "training",
        url: `/dashboard/training/${training.id}`,
      });
    });

    // Search assets
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { assetCode: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { category: true },
      take: 5,
    });

    assets.forEach((asset: any) => {
      searchResults.push({
        id: asset.id,
        title: asset.name,
        subtitle: `Asset - ${asset.category?.name || "No category"}`,
        type: "asset",
        url: `/dashboard/inventory/assets/${asset.id}`,
      });
    });

    // Search payroll records
    const payrolls = await prisma.payrollRecord.findMany({
      where: {
        employee: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { employee: true },
      take: 5,
    });

    payrolls.forEach((payroll: any) => {
      searchResults.push({
        id: payroll.id,
        title: `Payroll - ${payroll.month}/${payroll.year}`,
        subtitle: `${payroll.employee.firstName} ${payroll.employee.lastName} - ${payroll.netPay} paid`,
        type: "payroll",
        url: `/dashboard/payroll/${payroll.id}`,
      });
    });

    return NextResponse.json({ results: searchResults });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
