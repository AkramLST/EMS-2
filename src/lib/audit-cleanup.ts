import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_RETENTION, getRetentionPeriod, shouldKeepAuditLog } from "@/lib/audit-retention";

/**
 * Clean up old audit logs based on retention policies
 */
export async function cleanupAuditLogs(options: {
  dryRun?: boolean;
  specificActions?: string[];
  specificResources?: string[];
  verbose?: boolean;
} = {}) {
  const { dryRun = true, specificActions, specificResources, verbose = false } = options;

  if (verbose) {
    console.log("🧹 Starting audit log cleanup...");
    console.log("📋 Options:", { dryRun, specificActions, specificResources });
  }

  try {
    // Build where clause
    const whereClause: any = {};

    if (specificActions && specificActions.length > 0) {
      whereClause.action = { in: specificActions };
    }

    if (specificResources && specificResources.length > 0) {
      whereClause.resource = { in: specificResources };
    }

    // Get all logs that match criteria
    const allLogs = await prisma.auditLog.findMany({
      where: whereClause,
      select: {
        id: true,
        action: true,
        resource: true,
        timestamp: true,
        userId: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    if (verbose) {
      console.log(`📊 Found ${allLogs.length} total logs to analyze`);
    }

    // Separate logs to keep and delete
    const logsToKeep: string[] = [];
    const logsToDelete: string[] = [];
    const retentionSummary: Record<string, { keep: number; delete: number }> = {};

    for (const log of allLogs) {
      const shouldKeep = shouldKeepAuditLog(log.action, log.resource, log.timestamp);

      if (shouldKeep) {
        logsToKeep.push(log.id);
      } else {
        logsToDelete.push(log.id);
      }

      // Track retention stats
      const key = `${log.action}:${log.resource}`;
      if (!retentionSummary[key]) {
        retentionSummary[key] = { keep: 0, delete: 0 };
      }

      if (shouldKeep) {
        retentionSummary[key].keep++;
      } else {
        retentionSummary[key].delete++;
      }
    }

    if (verbose) {
      console.log(`✅ Logs to keep: ${logsToKeep.length}`);
      console.log(`🗑️ Logs to delete: ${logsToDelete.length}`);
      console.log("\n📈 Retention Summary:");
      Object.entries(retentionSummary).forEach(([key, stats]) => {
        console.log(`  ${key}: keep=${stats.keep}, delete=${stats.delete}`);
      });
    }

    if (dryRun) {
      if (verbose) {
        console.log("🔍 Dry run completed - no logs were deleted");
      }
      return {
        dryRun: true,
        logsAnalyzed: allLogs.length,
        logsToKeep: logsToKeep.length,
        logsToDelete: logsToDelete.length,
        retentionSummary,
      };
    }

    // Actually delete the logs
    if (logsToDelete.length > 0) {
      const deleteResult = await prisma.auditLog.deleteMany({
        where: {
          id: {
            in: logsToDelete,
          },
        },
      });

      if (verbose) {
        console.log(`🗑️ Deleted ${deleteResult.count} audit logs`);
      }

      // Create audit log for the cleanup operation
      await prisma.auditLog.create({
        data: {
          userId: "system", // System operation
          action: "DELETE",
          resource: "audit_log",
          resourceId: "bulk_cleanup",
          details: `System cleanup: deleted ${deleteResult.count} old audit logs. Criteria: ${JSON.stringify({
            specificActions,
            specificResources,
          })}`,
          ipAddress: "system",
          userAgent: "system-cleanup",
        },
      });

      return {
        dryRun: false,
        logsAnalyzed: allLogs.length,
        logsDeleted: deleteResult.count,
        logsKept: logsToKeep.length,
        retentionSummary,
      };
    } else {
      if (verbose) {
        console.log("✨ No logs needed to be deleted");
      }
      return {
        dryRun: false,
        logsAnalyzed: allLogs.length,
        logsDeleted: 0,
        logsKept: logsToKeep.length,
        retentionSummary,
      };
    }
  } catch (error) {
    console.error("❌ Audit log cleanup failed:", error);
    throw error;
  }
}

/**
 * Clean up audit logs by retention policy
 */
export async function cleanupByPolicy(
  policy: keyof typeof AUDIT_LOG_RETENTION,
  options: { dryRun?: boolean; verbose?: boolean } = {}
) {
  const { dryRun = true, verbose = false } = options;

  if (verbose) {
    console.log(`🧹 Cleaning up audit logs with policy: ${policy}`);
  }

  const retentionDays = AUDIT_LOG_RETENTION[policy];

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (retentionDays as number));

  if (verbose) {
    console.log(`📅 Keeping logs from: ${cutoffDate.toISOString()} onwards`);
    console.log(`🗑️ Deleting logs older than: ${retentionDays} days`);
  }

  // Build where clause for logs older than retention period
  const whereClause = {
    timestamp: {
      lt: cutoffDate,
    },
  };

  // Count logs that would be affected
  const logsToDelete = await prisma.auditLog.count({
    where: whereClause,
  });

  if (verbose) {
    console.log(`📊 Found ${logsToDelete} logs older than retention period`);
  }

  if (dryRun) {
    return {
      dryRun: true,
      policy,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      logsFound: logsToDelete,
    };
  }

  // Actually delete the logs
  const deleteResult = await prisma.auditLog.deleteMany({
    where: whereClause,
  });

  if (verbose) {
    console.log(`🗑️ Deleted ${deleteResult.count} audit logs using ${policy} policy`);
  }

  // Create audit log for the cleanup operation
  await prisma.auditLog.create({
    data: {
      userId: "system",
      action: "DELETE",
      resource: "audit_log",
      resourceId: `policy_cleanup_${policy}`,
      details: `System cleanup using ${policy} policy: deleted ${deleteResult.count} audit logs older than ${retentionDays} days`,
      ipAddress: "system",
      userAgent: "system-cleanup",
    },
  });

  return {
    dryRun: false,
    policy,
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    logsDeleted: deleteResult.count,
  };
}

/**
 * Get audit log statistics and cleanup recommendations
 */
export async function getAuditLogStats() {
  const now = new Date();

  // Get basic statistics
  const [
    totalLogs,
    logsLast30Days,
    logsLast90Days,
    logsLastYear,
    logsOlderThanYear,
  ] = await Promise.all([
    prisma.auditLog.count(),

    prisma.auditLog.count({
      where: {
        timestamp: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    prisma.auditLog.count({
      where: {
        timestamp: {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    prisma.auditLog.count({
      where: {
        timestamp: {
          gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    prisma.auditLog.count({
      where: {
        timestamp: {
          lt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Get breakdown by action and resource
  const [actionBreakdown, resourceBreakdown] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    }),

    prisma.auditLog.groupBy({
      by: ["resource"],
      _count: { resource: true },
      orderBy: { _count: { resource: "desc" } },
    }),
  ]);

  return {
    summary: {
      total: totalLogs,
      last30Days: logsLast30Days,
      last90Days: logsLast90Days,
      lastYear: logsLastYear,
      olderThanYear: logsOlderThanYear,
    },
    breakdown: {
      byAction: actionBreakdown.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      byResource: resourceBreakdown.map((item) => ({
        resource: item.resource,
        count: item._count.resource,
      })),
    },
    recommendations: {
      cleanupCandidates: logsOlderThanYear,
      suggestedRetention: {
        authentication: "2 years",
        employeeChanges: "7 years",
        systemActions: "3 years",
        general: "1 year",
      },
    },
  };
}
