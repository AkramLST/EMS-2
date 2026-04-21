-- Create emergency contacts table
CREATE TABLE "emergency_contacts" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relation" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- Index to speed up lookups by employee
CREATE INDEX "emergency_contacts_employeeId_idx" ON "emergency_contacts"("employeeId");

-- Foreign key back to employees
ALTER TABLE "emergency_contacts"
  ADD CONSTRAINT "emergency_contacts_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
