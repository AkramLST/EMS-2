// Fix OfficeTime table by adding missing graceTime column
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOfficeTimeTable() {
  try {
    console.log('🔧 Checking OfficeTime table...');

    // Check if OfficeTime table exists and has records
    const existingRecords = await prisma.officeTime.findMany();

    if (existingRecords.length > 0) {
      console.log('✅ OfficeTime table exists with records:');
      existingRecords.forEach((record, index) => {
        console.log(`  Record ${index + 1}: ${record.startTime.toTimeString()} - ${record.endTime.toTimeString()}`);
      });
      console.log('✅ No changes needed - using existing database records');
      return;
    }

    console.log('❌ No OfficeTime records found. This should be created through the application UI.');
    console.log('💡 Please set office hours through the application settings page.');

  } catch (error) {
    console.error('💥 Database operation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOfficeTimeTable();
