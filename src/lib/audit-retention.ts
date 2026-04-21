// Audit log retention policies (in days)
import { prisma } from "@/lib/prisma";

export const AUDIT_LOG_RETENTION = {
  // Authentication events - keep for 2 years
  AUTHENTICATION: 365 * 2, // LOGIN, LOGOUT, SESSION_START, SESSION_END

  // Employee data changes - keep for 7 years (legal requirement)
  EMPLOYEE_CHANGES: 365 * 7, // CREATE, UPDATE, DELETE on employee resources

  // System administrative actions - keep for 3 years
  SYSTEM_ACTIONS: 365 * 3, // Changes to system configuration, user roles, etc.

  // Security events - keep for 1 year
  SECURITY_EVENTS: 365 * 1, // Failed logins, permission changes, etc.

  // General audit logs - keep for 1 year
  GENERAL: 365 * 1,

  // Specific action retention
  ACTIONS: {
    LOGIN: 365 * 2,
    LOGOUT: 365 * 2,
    CREATE: 365 * 7,
    UPDATE: 365 * 7,
    DELETE: 365 * 7,
    SESSION_START: 365 * 1,
    SESSION_END: 365 * 1,
  },

  // Specific resource retention
  RESOURCES: {
    employee: 365 * 7,
    user: 365 * 2,
    department: 365 * 7,
    leave: 365 * 3,
    payroll: 365 * 7,
    attendance: 365 * 2,
    performance: 365 * 3,
    training: 365 * 2,
    asset: 365 * 5,
    inventory: 365 * 3,
    announcement: 365 * 1,
    holiday: 365 * 2,
    user_session: 365 * 1,
  },
} as const;

export type RetentionPolicy = keyof typeof AUDIT_LOG_RETENTION;
export type ActionType = keyof typeof AUDIT_LOG_RETENTION.ACTIONS;
export type ResourceType = keyof typeof AUDIT_LOG_RETENTION.RESOURCES;

/**
 * Get retention period for a specific audit log entry
 */
export function getRetentionPeriod(action: string, resource: string): number {
  // Check specific action retention first
  if (AUDIT_LOG_RETENTION.ACTIONS[action as ActionType]) {
    return AUDIT_LOG_RETENTION.ACTIONS[action as ActionType];
  }

  // Check specific resource retention
  if (AUDIT_LOG_RETENTION.RESOURCES[resource as ResourceType]) {
    return AUDIT_LOG_RETENTION.RESOURCES[resource as ResourceType];
  }

  // Default retention
  return AUDIT_LOG_RETENTION.GENERAL;
}

/**
 * Check if an audit log entry should be kept based on retention policy
 */
export function shouldKeepAuditLog(
  action: string,
  resource: string,
  timestamp: Date
): boolean {
  const retentionDays = getRetentionPeriod(action, resource);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return timestamp >= cutoffDate;
}

/**
 * Get cleanup statistics for audit logs
 */
export async function getAuditLogCleanupStats() {
  const now = new Date();
  const stats = {
    total: 0,
    byPolicy: {
      keep: 0,
      delete: 0,
    },
    byAction: {} as Record<string, { keep: number; delete: number }>,
    byResource: {} as Record<string, { keep: number; delete: number }>,
  };

  // Get all audit logs with their metadata
  const allLogs = await prisma.auditLog.findMany({
    select: {
      id: true,
      action: true,
      resource: true,
      timestamp: true,
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  stats.total = allLogs.length;

  // Analyze each log
  for (const log of allLogs) {
    const shouldKeep = shouldKeepAuditLog(log.action, log.resource, log.timestamp);

    // Update policy stats
    if (shouldKeep) {
      stats.byPolicy.keep++;
    } else {
      stats.byPolicy.delete++;
    }

    // Update action stats
    if (!stats.byAction[log.action]) {
      stats.byAction[log.action] = { keep: 0, delete: 0 };
    }
    if (shouldKeep) {
      stats.byAction[log.action].keep++;
    } else {
      stats.byAction[log.action].delete++;
    }

    // Update resource stats
    if (!stats.byResource[log.resource]) {
      stats.byResource[log.resource] = { keep: 0, delete: 0 };
    }
    if (shouldKeep) {
      stats.byResource[log.resource].keep++;
    } else {
      stats.byResource[log.resource].delete++;
    }
  }

  return stats;
}
