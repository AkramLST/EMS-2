-- AddForeignKey
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
