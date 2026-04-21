#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupOfficeHours() {
  try {
    console.log('🔧 Setting up office hours...');

    // Check if office hours already exist
    const existingOfficeTime = await prisma.officeTime.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (existingOfficeTime) {
      console.log('✅ Office hours already configured:');
      console.log(`   Start Time: ${existingOfficeTime.startTime.toTimeString()}`);
      console.log(`   End Time: ${existingOfficeTime.endTime.toTimeString()}`);
      console.log(`   Grace Time: ${existingOfficeTime.graceTime} minutes`);
      return;
    }

    // Create default office hours (9:00 AM - 5:00 PM PKT)
    const today = new Date();
    
    // Set start time to 9:00 AM
    const startTime = new Date(today);
    startTime.setHours(9, 0, 0, 0);
    
    // Set end time to 5:00 PM  
    const endTime = new Date(today);
    endTime.setHours(17, 0, 0, 0);

    const officeTime = await prisma.officeTime.create({
      data: {
        id: 'default',
        startTime: startTime,
        endTime: endTime,
        graceTime: 60, // 60 minutes grace time
      }
    });

    console.log('✅ Office hours created successfully:');
    console.log(`   Start Time: ${officeTime.startTime.toTimeString()}`);
    console.log(`   End Time: ${officeTime.endTime.toTimeString()}`);
    console.log(`   Grace Time: ${officeTime.graceTime} minutes`);

  } catch (error) {
    console.error('❌ Error setting up office hours:', error);
    
    // If the error is due to unique constraint (record already exists), try upsert
    if (error.code === 'P2002') {
      console.log('🔄 Record exists, trying to update...');
      
      try {
        const today = new Date();
        const startTime = new Date(today);
        startTime.setHours(9, 0, 0, 0);
        
        const endTime = new Date(today);
        endTime.setHours(17, 0, 0, 0);

        const officeTime = await prisma.officeTime.upsert({
          where: { id: 'default' },
          update: {
            startTime: startTime,
            endTime: endTime,
            graceTime: 60,
          },
          create: {
            id: 'default',
            startTime: startTime,
            endTime: endTime,
            graceTime: 60,
          }
        });

        console.log('✅ Office hours updated successfully:');
        console.log(`   Start Time: ${officeTime.startTime.toTimeString()}`);
        console.log(`   End Time: ${officeTime.endTime.toTimeString()}`);
        console.log(`   Grace Time: ${officeTime.graceTime} minutes`);
        
      } catch (upsertError) {
        console.error('❌ Failed to upsert office hours:', upsertError);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupOfficeHours();
