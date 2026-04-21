import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET_NAME = 'profile-images';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ message: 'employeeId is required' }, { status: 400 });
    }

    // Check the database for profile image URL
    const employee = await prisma.employee.findUnique({
      where: { employeeId: employeeId },
      select: { profileImage: true }
    });

    let originalUrl: string | null = null;
    try {
      const { data: originals } = await supabase.storage
        .from(BUCKET_NAME)
        .list('profiles/original', { search: employeeId });

      const originalMatch = originals?.find((file) => file.name.startsWith(employeeId));
      if (originalMatch) {
        const originalPath = `profiles/original/${originalMatch.name}`;
        const { data: originalPublic } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(originalPath);
        originalUrl = originalPublic.publicUrl;
      }
    } catch (originalError) {
      console.warn('[Profile Image API] Failed to resolve original image:', originalError);
    }

    if (employee?.profileImage) {
      return NextResponse.json({ imageUrl: employee.profileImage, originalUrl, hasImage: true });
    }
    return NextResponse.json({ imageUrl: null, originalUrl, hasImage: false });

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
    const originalFile: File | null = data.get('original') as unknown as File;
    const employeeId = (data.get('employeeId') as string | null)?.trim();

    console.log('[Profile Image Upload] Starting upload for employeeId:', employeeId);

    if (!file) {
      return NextResponse.json({ message: 'No cropped file received' }, { status: 400 });
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

    if (originalFile && !originalFile.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid original file type. Only images are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let originalBuffer: Buffer | null = null;
    let originalPath: string | null = null;

    if (originalFile) {
      const originalBytes = await originalFile.arrayBuffer();
      originalBuffer = Buffer.from(originalBytes);
      const originalExtension = (originalFile.name.split('.').pop() || 'jpg').toLowerCase();
      originalPath = `profiles/original/${employeeId}.${originalExtension}`;
    }

    // Generate unique filename for cropped image (always jpeg)
    const filePath = `profiles/${employeeId}.jpg`;

    console.log('[Profile Image Upload] Uploading cropped image to Supabase:', filePath);

    // Delete old image if exists (Supabase will overwrite, but clean originals as well)
    try {
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list('profiles', {
          search: employeeId
        });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `profiles/${f.name}`);
        await supabase.storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);
        console.log('[Profile Image Upload] Deleted old cropped images:', filesToDelete);
      }

      if (originalPath) {
        const { data: existingOriginals } = await supabase.storage
          .from(BUCKET_NAME)
          .list('profiles/original', {
            search: employeeId
          });

        if (existingOriginals && existingOriginals.length > 0) {
          const originalsToDelete = existingOriginals.map(f => `profiles/original/${f.name}`);
          await supabase.storage
            .from(BUCKET_NAME)
            .remove(originalsToDelete);
          console.log('[Profile Image Upload] Deleted old original images:', originalsToDelete);
        }
      }
    } catch (deleteError) {
      console.warn('[Profile Image Upload] Could not delete old images:', deleteError);
    }

    // Upload cropped image to Supabase Storage (always stored as JPEG)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('[Profile Image Upload] Supabase upload error:', uploadError);
      return NextResponse.json({
        message: 'Failed to upload image to storage',
        error: uploadError.message
      }, { status: 500 });
    }

    console.log('[Profile Image Upload] Cropped upload successful:', uploadData);

    let originalPublicUrl: string | null = null;
    if (originalBuffer && originalPath) {
      console.log('[Profile Image Upload] Uploading original image to Supabase:', originalPath);
      const { error: originalUploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(originalPath, originalBuffer, {
          contentType: originalFile?.type || 'image/jpeg',
          upsert: true
        });

      if (originalUploadError) {
        console.error('[Profile Image Upload] Supabase original upload error:', originalUploadError);
      } else {
        const { data: originalUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(originalPath);
        originalPublicUrl = originalUrlData.publicUrl;
      }
    }

    // Get public URL for cropped image
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;
    console.log('[Profile Image Upload] Cropped image public URL:', imageUrl);

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
      originalUrl: originalPublicUrl,
      success: true
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({
      message: 'Failed to upload image',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({ message: 'employeeId is required' }, { status: 400 });
    }

    console.log('[Profile Image Delete] Deleting image for employeeId:', employeeId);

    // List and delete cropped images for this employee
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list('profiles', {
        search: employeeId
      });

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `profiles/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);

      if (deleteError) {
        console.error('[Profile Image Delete] Supabase delete error:', deleteError);
        return NextResponse.json({
          message: 'Failed to delete image from storage',
          error: deleteError.message
        }, { status: 500 });
      }

      console.log('[Profile Image Delete] Deleted cropped files:', filesToDelete);
    }

    // Delete original images for this employee
    const { data: originalFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list('profiles/original', {
        search: employeeId
      });

    if (originalFiles && originalFiles.length > 0) {
      const originalsToDelete = originalFiles.map(f => `profiles/original/${f.name}`);
      const { error: originalDeleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(originalsToDelete);

      if (originalDeleteError) {
        console.error('[Profile Image Delete] Supabase original delete error:', originalDeleteError);
        return NextResponse.json({
          message: 'Failed to delete original image from storage',
          error: originalDeleteError.message
        }, { status: 500 });
      }

      console.log('[Profile Image Delete] Deleted original files:', originalsToDelete);
    }

    // Update database
    await prisma.employee.update({
      where: { employeeId: employeeId },
      data: { profileImage: null }
    });

    return NextResponse.json({
      message: 'Image deleted successfully',
      success: true
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({
      message: 'Failed to delete image',
      success: false
    }, { status: 500 });
  }
}
