import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ message: 'employeeId is required' }, { status: 400 });
    }

    console.log('[Profile Image API] Looking for employeeId:', employeeId);

    // First check the database
    try {
      const employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId },
        select: { profileImage: true }
      });

      if (employee?.profileImage) {
        console.log('[Profile Image API] Found in database:', employee.profileImage);
        return NextResponse.json({ imageUrl: employee.profileImage, hasImage: true });
      }
    } catch (dbError) {
      console.error('[Profile Image API] Database error:', dbError);
    }

    // Fallback: check file system for existing images
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    for (const ext of exts) {
      const candidate = join(uploadsDir, `${employeeId}.${ext}`);
      console.log('[Profile Image API] Checking file:', candidate);
      try {
        await readFile(candidate);
        const imageUrl = `/uploads/profiles/${employeeId}.${ext}`;
        console.log('[Profile Image API] Found image in filesystem:', imageUrl);
        
        // Update database with found image
        try {
          await prisma.employee.update({
            where: { employeeId: employeeId },
            data: { profileImage: imageUrl }
          });
          console.log('[Profile Image API] Updated database with found image');
        } catch (updateError) {
          console.error('[Profile Image API] Failed to update database:', updateError);
        }
        
        return NextResponse.json({ imageUrl, hasImage: true });
      } catch (err) {
        // continue trying next extension
      }
    }

    console.log('[Profile Image API] No image found for employeeId:', employeeId);
    return NextResponse.json({ imageUrl: null, hasImage: false });

  } catch (error) {
    console.error('Error fetching profile image:', error);
    return NextResponse.json({
      message: 'Failed to fetch profile image',
      imageUrl: null,
      hasImage: false
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('image') as unknown as File;
    const employeeId = (data.get('employeeId') as string | null)?.trim();

    console.log('[Profile Image Upload] Starting upload for employeeId:', employeeId);

    if (!file) {
      return NextResponse.json({ message: 'No file received' }, { status: 400 });
    }
    if (!employeeId) {
      return NextResponse.json({ message: 'employeeId is required' }, { status: 400 });
    }

    console.log('[Profile Image Upload] File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      employeeId: employeeId
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Clean up any previous image with different extension
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    for (const ext of exts) {
      const oldPath = join(uploadsDir, `${employeeId}.${ext}`);
      try { await unlink(oldPath); } catch (_) {}
    }

    // Save file with employeeId as filename
    const fileExtension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${employeeId}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    console.log('[Profile Image Upload] Saving file as:', fileName);
    console.log('[Profile Image Upload] Full path:', filePath);

    // Save file
    await writeFile(filePath, buffer);

    // Return the public URL
    const imageUrl = `/uploads/profiles/${fileName}`;

    console.log('[Profile Image Upload] Upload successful:', imageUrl);

    // Update the database with the profile image URL
    try {
      await prisma.employee.update({
        where: { employeeId: employeeId },
        data: { profileImage: imageUrl }
      });
      console.log('[Profile Image Upload] Database updated with imageUrl:', imageUrl);
    } catch (dbError) {
      console.error('[Profile Image Upload] Failed to update database:', dbError);
      // Don't fail the entire operation if DB update fails
    }

    return NextResponse.json({
      message: 'Image uploaded successfully',
      imageUrl,
      success: true
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({
      message: 'Failed to upload image',
      success: false
    }, { status: 500 });
  }
}
