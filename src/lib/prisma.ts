import { PrismaClient } from "@prisma/client";

// Explicitly disable all Prisma debug logging
process.env.DEBUG = "";
process.env.PRISMA_DEBUG = "";
process.env.PRISMA_QUERY_ENGINE_DEBUG = "";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const canInitialisePrisma = Boolean(process.env.DATABASE_URL);
let prismaClient: PrismaClient | null = null;

if (canInitialisePrisma) {
  try {
    prismaClient =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: [],
      });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaClient;
    }
  } catch (error) {
    console.error("[Prisma] Client initialization error:", error);
    prismaClient = null;
  }
} else {
  console.warn(
    "[Prisma] DATABASE_URL is not set. Prisma client will remain unavailable.",
  );
}

const prismaFallback = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "[Prisma] Client is unavailable. Ensure DATABASE_URL is configured before accessing Prisma methods.",
      );
    },
  },
) as PrismaClient;

export const prisma = prismaClient ?? prismaFallback;
export const isPrismaAvailable = () => prismaClient !== null;
