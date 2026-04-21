import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get("action") || "ALL";
    const employeeFilter = searchParams.get("employee") || "ALL";
    const resourceFilter = searchParams.get("resource") || "ALL";
    const resourceIdFilter = searchParams.get("resourceId") || "";
    const ipFilter = searchParams.get("ipAddress") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");

    // Build where clause
    const whereClause: any = {};

    // Action filter
    if (actionFilter !== "ALL") {
      whereClause.action = actionFilter;
    }

    // Employee filter
    if (employeeFilter !== "ALL") {
      whereClause.userId = employeeFilter;
    }

    // Resource filter
    if (resourceFilter !== "ALL") {
      whereClause.resource = resourceFilter;
    }

    // Resource ID filter
    if (resourceIdFilter) {
      whereClause.resourceId = { contains: resourceIdFilter };
    }

    // IP Address filter
    if (ipFilter) {
      whereClause.ipAddress = { contains: ipFilter };
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            include: { employee: true },
          },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.employee
        ? `${log.user.employee.firstName} ${log.user.employee.lastName}`
        : log.user.email,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const { logIds, deleteAll } = body || {};

    if (deleteAll) {
      const totalLogs = await prisma.auditLog.count();

      if (totalLogs === 0) {
        return NextResponse.json(
          { message: "No audit logs available" },
          { status: 404 }
        );
      }

      await prisma.auditLog.deleteMany();

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          resource: "audit_log",
          resourceId: "ALL",
          details: `Deleted all audit logs (${totalLogs} entries)`,
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return NextResponse.json({ deleted: totalLogs });
    }

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json(
        { message: "logIds array is required" },
        { status: 400 }
      );
    }

    const existingLogs = await prisma.auditLog.findMany({
      where: {
        id: {
          in: logIds,
        },
      },
      select: {
        id: true,
        resource: true,
        resourceId: true,
      },
    });

    if (existingLogs.length === 0) {
      return NextResponse.json(
        { message: "No audit logs found for provided IDs" },
        { status: 404 }
      );
    }

    await prisma.auditLog.deleteMany({
      where: {
        id: {
          in: logIds,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        resource: "audit_log",
        resourceId: existingLogs.length > 1 ? "BULK" : existingLogs[0].id,
        details:
          existingLogs.length > 1
            ? `Deleted ${existingLogs.length} audit logs`
            : `Deleted audit log ${existingLogs[0].id} (${existingLogs[0].resource}:${existingLogs[0].resourceId})`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ deleted: existingLogs.length });
  } catch (error) {
    console.error("Failed to delete audit logs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
