import type { PrismaClient, SessionStatus } from "@prisma/client";

export const SESSION_THRESHOLDS = {
  heartbeatMs: 60 * 1000, // 1 minute heartbeat interval
  awayMs: 3 * 60 * 1000, // mark as away after 3 minutes of inactivity
  offlineMs: 6 * 60 * 1000, // mark as offline after 6 minutes of inactivity
};

/**
 * Marks sessions that have exceeded inactivity thresholds as AWAY or OFFLINE directly in the database.
 */
export async function expireStaleSessions(
  prisma: PrismaClient,
  now: Date = new Date()
) {
  const offlineCutoff = new Date(now.getTime() - SESSION_THRESHOLDS.offlineMs);
  const awayCutoff = new Date(now.getTime() - SESSION_THRESHOLDS.awayMs);

  // Mark very stale sessions as fully inactive/offline
  await prisma.userSession.updateMany({
    where: {
      isActive: true,
      lastActivity: {
        lt: offlineCutoff,
      },
    },
    data: {
      isActive: false,
      status: "OFFLINE",
      expiresAt: now,
      lastActivity: offlineCutoff,
    },
  });

  // Downgrade online sessions to away when idle past the threshold (but still within offline window)
  await prisma.userSession.updateMany({
    where: {
      isActive: true,
      status: "ONLINE",
      lastActivity: {
        lt: awayCutoff,
        gte: offlineCutoff,
      },
    },
    data: {
      status: "AWAY",
    },
  });
}

/**
 * Normalizes a stored session status according to the user activity timestamps.
 */
export function normalizeSessionStatus(
  storedStatus: SessionStatus,
  lastActivity: Date | string | null,
  now: Date = new Date()
): SessionStatus {
  if (!lastActivity) {
    return storedStatus === "OFFLINE" ? storedStatus : "OFFLINE";
  }

  const lastActivityDate =
    lastActivity instanceof Date ? lastActivity : new Date(lastActivity);
  const inactiveMs = now.getTime() - lastActivityDate.getTime();

  if (inactiveMs >= SESSION_THRESHOLDS.offlineMs) {
    return "OFFLINE";
  }

  if (storedStatus === "ONLINE" && inactiveMs >= SESSION_THRESHOLDS.awayMs) {
    return "AWAY";
  }

  return storedStatus;
}
