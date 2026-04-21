-- Manual migration: add employee certifications support without data loss
-- Run this script against the employee_management database to create the
-- enum and table required by the updated Prisma schema.

-- 1. Create CertificationStatus enum if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificationStatus') THEN
    CREATE TYPE "CertificationStatus" AS ENUM ('IN_PROGRESS', 'ACTIVE', 'EXPIRED', 'REVOKED');
  END IF;
END$$;

-- 2. Create employee_certifications table if missing
CREATE TABLE IF NOT EXISTS "employee_certifications" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "issuedBy" TEXT,
  "issueDate" TIMESTAMP,
  "expiryDate" TIMESTAMP,
  "status" "CertificationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "verificationUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Ensure foreign key constraint exists
ALTER TABLE "employee_certifications"
  DROP CONSTRAINT IF EXISTS "employee_certifications_employeeId_fkey";
ALTER TABLE "employee_certifications"
  ADD CONSTRAINT "employee_certifications_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE;

-- 4. Ensure index on employeeId exists
CREATE INDEX IF NOT EXISTS "employee_certifications_employeeId_idx"
  ON "employee_certifications" ("employeeId");
