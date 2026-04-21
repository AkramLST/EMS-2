-- DropForeignKey
ALTER TABLE "leave_applications" DROP CONSTRAINT "leave_applications_approvedBy_fkey";

-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
