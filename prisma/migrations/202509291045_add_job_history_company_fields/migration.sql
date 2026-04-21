-- Ensure job_history table exists for shadow database environments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'job_history'
  ) THEN
    CREATE TABLE "job_history" (
      "id" TEXT PRIMARY KEY,
      "employeeId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "companyName" TEXT,
      "location" TEXT,
      "departmentId" TEXT,
      "managerId" TEXT,
      "designationId" TEXT,
      "startDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP WITH TIME ZONE,
      "changeReason" TEXT,
      "description" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "employmentType" TEXT
    );
  END IF;

  -- Add companyName, location, and description columns if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'job_history'
      AND column_name = 'companyName'
  ) THEN
    ALTER TABLE "job_history"
      ADD COLUMN "companyName" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'job_history'
      AND column_name = 'location'
  ) THEN
    ALTER TABLE "job_history"
      ADD COLUMN "location" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'job_history'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE "job_history"
      ADD COLUMN "description" TEXT;
  END IF;
END $$;
