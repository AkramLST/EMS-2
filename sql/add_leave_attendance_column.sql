-- Adds leaveApplicationId column and foreign key without affecting existing data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance_records'
      AND column_name = 'leaveApplicationId'
  ) THEN
    ALTER TABLE "attendance_records"
      ADD COLUMN "leaveApplicationId" TEXT;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'attendance_records'
      AND tc.constraint_name = 'attendance_records_leaveApplicationId_fkey'
  ) THEN
    ALTER TABLE "attendance_records"
      ADD CONSTRAINT "attendance_records_leaveApplicationId_fkey"
      FOREIGN KEY ("leaveApplicationId")
      REFERENCES "leave_applications"("id")
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "attendance_records_leaveApplicationId_idx"
  ON "attendance_records" ("leaveApplicationId");
