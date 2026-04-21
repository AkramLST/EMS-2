/*
  Warnings:

  - Made the column `designationId` on table `employees` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_designationId_fkey";

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "designationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
