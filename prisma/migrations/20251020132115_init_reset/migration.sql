/*
  Warnings:

  - The values [POLICY] on the enum `AnnouncementType` will be removed. If these variants are still used in the database, this will fail.
  - The values [HOLIDAY,LEAVE] on the enum `AttendanceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [COMPLETED] on the enum `EnrollmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ONGOING] on the enum `ProgramStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `departmentId` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `goals` table. All the data in the column will be lost.
  - The `employmentType` column on the `job_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `payroll_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AttendanceLocationSource" AS ENUM ('GPS', 'IP', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AnnouncementType_new" AS ENUM ('GENERAL', 'EVENT', 'HOLIDAY', 'URGENT');
ALTER TABLE "public"."announcements" ALTER COLUMN "type" TYPE "public"."AnnouncementType_new" USING ("type"::text::"public"."AnnouncementType_new");
ALTER TYPE "public"."AnnouncementType" RENAME TO "AnnouncementType_old";
ALTER TYPE "public"."AnnouncementType_new" RENAME TO "AnnouncementType";
DROP TYPE "public"."AnnouncementType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."AttendanceStatus_new" AS ENUM ('PRESENT', 'LATE', 'EARLY_DEPARTURE', 'HALF_DAY', 'ABSENT', 'ON_TIME', 'ON_LEAVE');
ALTER TABLE "public"."attendance_records" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."attendance_records" ALTER COLUMN "status" TYPE "public"."AttendanceStatus_new" USING ("status"::text::"public"."AttendanceStatus_new");
ALTER TYPE "public"."AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "public"."AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "public"."AttendanceStatus_old";
ALTER TABLE "public"."attendance_records" ALTER COLUMN "status" SET DEFAULT 'PRESENT';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."DocumentType" ADD VALUE 'PASSPORT';
ALTER TYPE "public"."DocumentType" ADD VALUE 'VISA';
ALTER TYPE "public"."DocumentType" ADD VALUE 'LICENSE';
ALTER TYPE "public"."DocumentType" ADD VALUE 'CERTIFICATE';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."EnrollmentStatus_new" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'DROPPED');
ALTER TABLE "public"."training_enrollments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."training_enrollments" ALTER COLUMN "status" TYPE "public"."EnrollmentStatus_new" USING ("status"::text::"public"."EnrollmentStatus_new");
ALTER TYPE "public"."EnrollmentStatus" RENAME TO "EnrollmentStatus_old";
ALTER TYPE "public"."EnrollmentStatus_new" RENAME TO "EnrollmentStatus";
DROP TYPE "public"."EnrollmentStatus_old";
ALTER TABLE "public"."training_enrollments" ALTER COLUMN "status" SET DEFAULT 'ENROLLED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ProgramStatus_new" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."training_programs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."training_programs" ALTER COLUMN "status" TYPE "public"."ProgramStatus_new" USING ("status"::text::"public"."ProgramStatus_new");
ALTER TYPE "public"."ProgramStatus" RENAME TO "ProgramStatus_old";
ALTER TYPE "public"."ProgramStatus_new" RENAME TO "ProgramStatus";
DROP TYPE "public"."ProgramStatus_old";
ALTER TABLE "public"."training_programs" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."announcements" DROP CONSTRAINT "announcements_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."employee_certifications" DROP CONSTRAINT "employee_certifications_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."goals" DROP CONSTRAINT "goals_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payroll_records" DROP CONSTRAINT "payroll_records_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payroll_records" DROP CONSTRAINT "payroll_records_salaryStructureId_fkey";

-- AlterTable
ALTER TABLE "public"."OfficeTime" ADD COLUMN     "graceTime" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "public"."announcements" DROP COLUMN "departmentId";

-- AlterTable
ALTER TABLE "public"."attendance_records" ADD COLUMN     "clockInLatitude" DOUBLE PRECISION,
ADD COLUMN     "clockInLocation" TEXT,
ADD COLUMN     "clockInLocationSource" "public"."AttendanceLocationSource",
ADD COLUMN     "clockInLongitude" DOUBLE PRECISION,
ADD COLUMN     "leaveApplicationId" TEXT;

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "fileSize" INTEGER;

-- AlterTable
ALTER TABLE "public"."emergency_contacts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."employee_certifications" ALTER COLUMN "issueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiryDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "emergencyContactAddressLine1" TEXT,
ADD COLUMN     "emergencyContactAddressLine2" TEXT,
ADD COLUMN     "emergencyContactCity" TEXT,
ADD COLUMN     "emergencyContactEmail" TEXT,
ADD COLUMN     "emergencyContactPostalCode" TEXT,
ADD COLUMN     "emergencyContactState" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "twitter" TEXT;

-- AlterTable
ALTER TABLE "public"."goals" DROP COLUMN "employeeId";

-- AlterTable
ALTER TABLE "public"."job_history" ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
DROP COLUMN "employmentType",
ADD COLUMN     "employmentType" "public"."EmploymentType";

-- DropTable
DROP TABLE "public"."payroll_records";

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'ONLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."passports" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."educations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "major" TEXT,
    "gpa" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_experiences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT,
    "location" TEXT,
    "employmentType" "public"."EmploymentType",
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "changeReason" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayrollRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "salaryStructureId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "presentDays" INTEGER NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "basicPay" DECIMAL(65,30) NOT NULL,
    "allowances" JSONB NOT NULL,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "deductions" JSONB NOT NULL,
    "overtimePay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "penalties" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(65,30) NOT NULL,
    "totalDeductions" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "taxableIncome" DECIMAL(65,30) NOT NULL,
    "incomeTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "professionalTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "providentFund" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "esi" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'GENERATED',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "payslipGenerated" BOOLEAN NOT NULL DEFAULT false,
    "payslipUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goal_assignments" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "public"."user_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "passports_employeeId_number_key" ON "public"."passports"("employeeId", "number");

-- CreateIndex
CREATE INDEX "work_experiences_employeeId_idx" ON "public"."work_experiences"("employeeId");

-- CreateIndex
CREATE INDEX "work_experiences_startDate_idx" ON "public"."work_experiences"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "goal_assignments_goalId_employeeId_key" ON "public"."goal_assignments"("goalId", "employeeId");

-- CreateIndex
CREATE INDEX "job_history_employeeId_idx" ON "public"."job_history"("employeeId");

-- CreateIndex
CREATE INDEX "job_history_startDate_idx" ON "public"."job_history"("startDate");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."passports" ADD CONSTRAINT "passports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."educations" ADD CONSTRAINT "educations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_history" ADD CONSTRAINT "job_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_history" ADD CONSTRAINT "job_history_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_history" ADD CONSTRAINT "job_history_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_history" ADD CONSTRAINT "job_history_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "public"."designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_history" ADD CONSTRAINT "job_history_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollRecord" ADD CONSTRAINT "PayrollRecord_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "public"."employee_salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_records" ADD CONSTRAINT "attendance_records_leaveApplicationId_fkey" FOREIGN KEY ("leaveApplicationId") REFERENCES "public"."leave_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goal_assignments" ADD CONSTRAINT "goal_assignments_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goal_assignments" ADD CONSTRAINT "goal_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_certifications" ADD CONSTRAINT "employee_certifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
