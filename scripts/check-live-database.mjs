#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLiveDatabase() {
  try {
    console.log('🔍 Checking live database connection and office hours...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check office hours table
    console.log('\n📋 Checking OfficeTime table...');
    
    const officeTimeCount = await prisma.officeTime.count();
    console.log(`   Total records: ${officeTimeCount}`);

    if (officeTimeCount > 0) {
      const allOfficeHours = await prisma.officeTime.findMany({
        orderBy: { createdAt: 'desc' }
      });

      console.log('\n📝 Office Hours Records:');
      allOfficeHours.forEach((record, index) => {
        console.log(`   Record ${index + 1}:`);
        console.log(`     ID: ${record.id}`);
        console.log(`     Start Time: ${record.startTime.toISOString()} (${record.startTime.toTimeString()})`);
        console.log(`     End Time: ${record.endTime.toISOString()} (${record.endTime.toTimeString()})`);
        console.log(`     Grace Time: ${record.graceTime} minutes`);
        console.log(`     Created: ${record.createdAt.toISOString()}`);
        console.log(`     Updated: ${record.updatedAt.toISOString()}`);
        console.log('');
      });

      // Test the API logic
      const latestRecord = allOfficeHours[0];
      console.log('🧪 Testing timezone conversion:');
      
      const formatPakistan = (date) => {
        const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
        const h = pakistanTime.getUTCHours();
        const m = pakistanTime.getUTCMinutes();
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      };

      console.log(`   Original Start Time: ${latestRecord.startTime.toTimeString()}`);
      console.log(`   Formatted Start Time: ${formatPakistan(latestRecord.startTime)}`);
      console.log(`   Original End Time: ${latestRecord.endTime.toTimeString()}`);
      console.log(`   Formatted End Time: ${formatPakistan(latestRecord.endTime)}`);

    } else {
      console.log('❌ No office hours found in database');
      console.log('💡 Run the setup-office-hours.mjs script to create default office hours');
    }

    // Check users table for authentication
    console.log('\n👥 Checking Users table...');
    const userCount = await prisma.user.count();
    console.log(`   Total users: ${userCount}`);

    if (userCount > 0) {
      const adminUsers = await prisma.user.count({
        where: { role: 'ADMINISTRATOR' }
      });
      console.log(`   Admin users: ${adminUsers}`);
    }

    console.log('\n✅ Database check completed successfully');

  } catch (error) {
    console.error('❌ Database check failed:', error);
    
    if (error.code === 'P1001') {
      console.error('💡 Database connection failed. Check your DATABASE_URL environment variable.');
    } else if (error.code === 'P2021') {
      console.error('💡 Table does not exist. Run database migrations.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkLiveDatabase();
