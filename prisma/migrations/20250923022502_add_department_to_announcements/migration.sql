-- AlterTable
ALTER TABLE "public"."announcements" ADD COLUMN     "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
