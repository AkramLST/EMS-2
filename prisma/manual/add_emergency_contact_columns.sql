ALTER TABLE "public"."employees"
  ADD COLUMN IF NOT EXISTS "emergencyContactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactAddressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactAddressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactCity" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactState" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPostalCode" TEXT;
