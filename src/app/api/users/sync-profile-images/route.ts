import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user || !['ADMINISTRATOR', 'HR_MANAGER'].includes(user.role)) {
      return NextResponse.json({ message: 'Unauthorized. Only Administrators and HR Managers can sync profile images.' }, { status: 401 });
    }

    console.log('[Sync User Profile Images] Starting sync process...');

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    let files: string[] = [];

    try {
      files = await readdir(uploadsDir);
    } catch (error) {
      console.log('[Sync User Profile Images] No uploads directory found');
      return NextResponse.json({
        message: 'No profile images directory found',
        synced: 0
      });
    }

    let syncedCount = 0;
    const results = [];

    for (const file of files) {
      // Extract employeeId from filename (e.g., EMP127808628.jpg -> EMP127808628)
      const employeeId = file.split('.')[0];
      const imageUrl = `/uploads/profiles/${file}`;

      try {
        // Check if employee exists and update their profileImage
        const employee = await prisma.employee.findUnique({
          where: { employeeId: employeeId },
          select: { id: true, profileImage: true, firstName: true, lastName: true }
        });

        if (employee) {
          if (!employee.profileImage) {
            // Update employee with profile image URL
            await prisma.employee.update({
              where: { employeeId: employeeId },
              data: { profileImage: imageUrl }
            });

            console.log(`[Sync User Profile Images] Updated ${employeeId} with ${imageUrl}`);
            syncedCount++;
            results.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              imageUrl,
              status: 'synced'
            });
          } else {
            results.push({
              employeeId,
              name: `${employee.firstName} ${employee.lastName}`,
              imageUrl: employee.profileImage,
              status: 'already_set'
            });
          }
        } else {
          console.log(`[Sync User Profile Images] No employee found for ${employeeId}`);
          results.push({
            employeeId,
            imageUrl,
            status: 'employee_not_found'
          });
        }
      } catch (error) {
        console.error(`[Sync User Profile Images] Error processing ${employeeId}:`, error);
        results.push({
          employeeId,
          imageUrl,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[Sync User Profile Images] Completed. Synced ${syncedCount} images.`);

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} user profile images`,
      synced: syncedCount,
      total: files.length,
      results
    });

  } catch (error) {
    console.error('[Sync User Profile Images] Error:', error);
    return NextResponse.json({
      message: 'Failed to sync user profile images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
