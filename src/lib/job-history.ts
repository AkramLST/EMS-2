import { Prisma, PrismaClient } from "@prisma/client";

export type JobHistoryClient = PrismaClient | Prisma.TransactionClient;

export interface JobHistoryLogInput {
  employeeId: string;
  title: string;
  companyName?: string | null;
  location?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  designationId?: string | null;
  employmentType?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  changeReason?: string | null;
  description?: string | null;
  createdById?: string | null;
}

/**
 * Closes any open job history entries (records with null endDate) for the specified employee.
 */
export async function closeOpenJobHistoryEntries(
  client: JobHistoryClient,
  employeeId: string,
  endDate: Date = new Date()
) {
  const jobHistoryClient = client as any;

  await jobHistoryClient.jobHistory.updateMany({
    where: {
      employeeId,
      endDate: null,
    },
    data: {
      endDate,
    },
  });
}

/**
 * Logs a new job history entry for an employee. Existing open entries are automatically closed.
 */
export async function logJobHistoryEntry(
  client: JobHistoryClient,
  input: JobHistoryLogInput
) {
  const {
    employeeId,
    title,
    companyName = null,
    location = null,
    departmentId = null,
    managerId = null,
    designationId = null,
    employmentType = null,
    startDate,
    endDate = null,
    changeReason = null,
    description = null,
    createdById = null,
  } = input;

  const effectiveStart = startDate ?? new Date();

  await closeOpenJobHistoryEntries(client, employeeId, effectiveStart);

  const jobHistoryClient = client as any;

  return jobHistoryClient.jobHistory.create({
    data: {
      employeeId,
      title,
      companyName,
      location,
      departmentId: departmentId ?? null,
      managerId: managerId ?? null,
      designationId: designationId ?? null,
      employmentType: employmentType ?? null,
      startDate: effectiveStart,
      endDate,
      changeReason,
      description,
      createdById,
    },
  });
}

export interface JobChangeDetectionInput {
  currentDesignationId: string;
  nextDesignationId?: string;
  currentDepartmentId?: string | null;
  nextDepartmentId?: string | null;
  currentManagerId?: string | null;
  nextManagerId?: string | null;
  currentEmploymentType?: string;
  nextEmploymentType?: string;
  currentWorkLocation?: string | null;
  nextWorkLocation?: string | null;
}

/**
 * Determines whether the provided employee changes should produce a job history record.
 */
export function hasJobChangeOccurred(input: JobChangeDetectionInput): boolean {
  const {
    currentDesignationId,
    nextDesignationId,
    currentDepartmentId,
    nextDepartmentId,
    currentManagerId,
    nextManagerId,
    currentEmploymentType,
    nextEmploymentType,
    currentWorkLocation,
    nextWorkLocation,
  } = input;

  if (nextDesignationId && nextDesignationId !== currentDesignationId) {
    return true;
  }

  if (typeof nextDepartmentId !== "undefined" && nextDepartmentId !== currentDepartmentId) {
    return true;
  }

  if (typeof nextManagerId !== "undefined" && nextManagerId !== currentManagerId) {
    return true;
  }

  if (
    typeof nextEmploymentType !== "undefined" &&
    typeof currentEmploymentType !== "undefined" &&
    nextEmploymentType !== currentEmploymentType
  ) {
    return true;
  }

  if (
    typeof nextWorkLocation !== "undefined" &&
    typeof currentWorkLocation !== "undefined" &&
    normalizeString(nextWorkLocation) !== normalizeString(currentWorkLocation)
  ) {
    return true;
  }

  return false;
}

function normalizeString(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}
