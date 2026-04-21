import { prisma } from "./prisma";

/**
 * Clean up expired and inactive sessions
 * This should be run periodically (e.g., via cron job or scheduled task)
 */
export async function cleanupExpiredSessions() {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Mark sessions as AWAY if no activity for 5 minutes
    const awayResult = await prisma.userSession.updateMany({
      where: {
        isActive: true,
        status: "ONLINE",
        lastActivity: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        status: "AWAY",
      },
    });

    // Mark sessions as OFFLINE if no activity for 30 minutes
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const offlineResult = await prisma.userSession.updateMany({
      where: {
        isActive: true,
        lastActivity: {
          lt: thirtyMinutesAgo,
        },
      },
      data: {
        isActive: false,
        status: "OFFLINE",
      },
    });

    // Delete very old sessions (older than 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deleteResult = await prisma.userSession.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    console.log("Session cleanup completed:", {
      markedAway: awayResult.count,
      markedOffline: offlineResult.count,
      deleted: deleteResult.count,
    });

    return {
      markedAway: awayResult.count,
      markedOffline: offlineResult.count,
      deleted: deleteResult.count,
    };
  } catch (error) {
    console.error("Session cleanup error:", error);
    throw error;
  }
}

/**
 * Get user's current online status
 */
export async function getUserOnlineStatus(userId: string) {
  try {
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    if (activeSessions.length === 0) {
      return "OFFLINE";
    }

    // Return the most active status
    const statusPriority: Record<string, number> = { OFFLINE: 0, AWAY: 1, BUSY: 2, ONLINE: 3 };
    let highestStatus = "OFFLINE";

    for (const session of activeSessions) {
      const sessionPriority = statusPriority[session.status] ?? 0;
      const currentPriority = statusPriority[highestStatus] ?? 0;
      if (sessionPriority > currentPriority) {
        highestStatus = session.status;
      }
    }

    return highestStatus;
  } catch (error) {
    console.error("Get user status error:", error);
    return "OFFLINE";
  }
}
