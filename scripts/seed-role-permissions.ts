/**
 * Seed Script: Migrate hardcoded role permissions to database
 *
 * This script populates the RolePermission table with the default permissions
 * defined in src/lib/permissions.ts. Run this after creating the database schema.
 *
 * Usage:
 *   npx tsx scripts/seed-role-permissions.ts
 */

import { PrismaClient, Role } from "@prisma/client";
import { ROLE_PERMISSIONS, Permission } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Starting role permissions seeding...\n");

  try {
    // Get all roles from the ROLE_PERMISSIONS object
    const roles = Object.keys(ROLE_PERMISSIONS) as Role[];

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const role of roles) {
      console.log(`\n📋 Processing role: ${role}`);

      const permissions = ROLE_PERMISSIONS[role];
      console.log(`   Found ${permissions.length} permissions for ${role}`);

      for (const permission of permissions) {
        try {
          // Check if permission already exists
          const existing = await prisma.rolePermission.findUnique({
            where: {
              role_permission: {
                role: role,
                permission: permission,
              },
            },
          });

          if (existing) {
            // Update if exists and is disabled
            if (!existing.isEnabled) {
              await prisma.rolePermission.update({
                where: { id: existing.id },
                data: { isEnabled: true },
              });
              totalUpdated++;
              console.log(`   ✓ Updated: ${permission} (enabled)`);
            } else {
              totalSkipped++;
              console.log(`   - Skipped: ${permission} (already exists)`);
            }
          } else {
            // Create new permission
            await prisma.rolePermission.create({
              data: {
                role: role,
                permission: permission,
                isEnabled: true,
              },
            });
            totalCreated++;
            console.log(`   ✓ Created: ${permission}`);
          }
        } catch (error) {
          console.error(`   ✗ Error processing ${permission}:`, error);
        }
      }

      console.log(
        `   Completed ${role}: ${permissions.length} permissions processed`
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Created:  ${totalCreated} permissions`);
    console.log(`🔄 Updated:  ${totalUpdated} permissions`);
    console.log(`⏭️  Skipped:  ${totalSkipped} permissions`);
    console.log(
      `📦 Total:    ${
        totalCreated + totalUpdated + totalSkipped
      } permissions processed`
    );
    console.log("=".repeat(60));

    console.log("\n✅ Role permissions seeding completed successfully!");

    // Display summary by role
    console.log("\n📈 Permissions by Role:");
    console.log("=".repeat(60));

    for (const role of roles) {
      const count = await prisma.rolePermission.count({
        where: { role: role, isEnabled: true },
      });
      console.log(`   ${role.padEnd(25)} : ${count} permissions`);
    }
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("\n✨ Database seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
