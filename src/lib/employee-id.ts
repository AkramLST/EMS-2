import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

function formatEmployeeId(sequence: number): string {
  const base = sequence.toString().padStart(4, "0");
  return `EMP${base}`;
}

/**
 * Generate the next sequential employee ID in the format EMP0001, EMP0002, ...
 * Uses the provided Prisma client/transaction, defaulting to the shared client.
 */
export async function generateSequentialEmployeeId(
  client: PrismaClientOrTx = prisma
): Promise<string> {
  const recentEmployees = await client.employee.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      employeeId: true,
    },
    take: 100,
  });

  let highestNumber = 0;

  for (const record of recentEmployees) {
    if (!record.employeeId) continue;
    const match = record.employeeId.match(/^EMP(\d{4})$/);
    if (!match) continue;
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed > highestNumber) {
      highestNumber = parsed;
    }
  }

  let nextNumber = highestNumber + 1;
  let employeeId = formatEmployeeId(nextNumber);

  // Ensure uniqueness in case existing data already uses the generated id
  // Limit iterations to avoid infinite loops in pathological cases
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await client.employee.findUnique({
      where: { employeeId },
      select: { id: true },
    });

    if (!existing) {
      return employeeId;
    }

    nextNumber += 1;
    employeeId = formatEmployeeId(nextNumber);
  }

  // Fallback: append timestamp suffix to avoid collision while keeping prefix
  const fallback = `${employeeId}-${Date.now()}`;
  return fallback;
}
