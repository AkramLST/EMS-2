import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { cleanupAuditLogs, cleanupByPolicy, getAuditLogStats } from "@/lib/audit-cleanup";
import { AUDIT_LOG_RETENTION } from "@/lib/audit-retention";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Audit log retention policies (in days)
const RETENTION_POLICIES = AUDIT_LOG_RETENTION;

type RetentionPolicy = keyof typeof RETENTION_POLICIES;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can clear audit logs
    if (user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      policy = "GENERAL",
      olderThanDays,
      specificActions,
      specificResources,
      dryRun = true,
      verbose = false,
    } = body;

    if (verbose) {
      console.log("🧹 Starting audit log cleanup...");
      console.log("📋 Options:", { policy, olderThanDays, specificActions, specificResources, dryRun });
    }

    // If using a predefined policy, use the cleanupByPolicy function
    if (policy !== "CUSTOM" && !olderThanDays && !specificActions && !specificResources) {
      const result = await cleanupByPolicy(policy as RetentionPolicy, {
        dryRun,
        verbose,
      });

      return NextResponse.json({
        message: dryRun ? "Dry run completed" : "Audit logs cleaned up successfully",
        ...result,
      });
    }

    // Otherwise, use the flexible cleanupAuditLogs function
    const result = await cleanupAuditLogs({
      dryRun,
      specificActions,
      specificResources,
      verbose,
    });

    return NextResponse.json({
      message: dryRun ? "Dry run completed - no logs deleted" : "Audit logs cleaned up successfully",
      ...result,
    });
  } catch (error) {
    console.error("Audit log cleanup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only administrators can view cleanup info
    if (user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const policy = searchParams.get("policy") || "GENERAL";
    const includeStats = searchParams.get("stats") === "true";

    // Get statistics about audit logs
    const stats = await getAuditLogStats();

    // Get policy-specific information
    const retentionDays = RETENTION_POLICIES[policy as RetentionPolicy] || RETENTION_POLICIES.GENERAL;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (retentionDays as number));

    // Count logs that would be affected by this policy
    const { prisma } = await import("@/lib/prisma");
    const logsAffected = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    const response: any = {
      policy,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      logsAffected,
      retentionPolicies: RETENTION_POLICIES,
    };

    // Include detailed statistics if requested
    if (includeStats) {
      response.detailedStats = stats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get audit log stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
