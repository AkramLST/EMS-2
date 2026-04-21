# Supabase Storage Migration Guide

This guide explains how to migrate profile image storage from local filesystem (`public/uploads`) to Supabase Storage.

## Prerequisites

1. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)
2. **Node Package**: Install Supabase client library

## Step-by-Step Migration

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Configure Environment Variables

Add these to your `.env` file and Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**
- Go to Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (keep this secret!)

### 3. Create Storage Bucket

In Supabase Dashboard → Storage:

1. Click **"New bucket"**
2. Name: `profile-images`
3. Set to **Public** (for direct URL access)
4. Click **Create bucket**

### 4. Set Storage Policies

Go to Storage → `profile-images` → Policies, and create these policies:

**Allow authenticated uploads:**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');
```

**Allow public read access:**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Public read access objects"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

**Allow authenticated updates:**
```sql
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');
```

**Allow authenticated deletes:**
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');
```

### 5. Replace API Route

Rename the current route and use the new Supabase version:

```bash
# Backup old route
mv src/app/api/employees/profile-image/route.ts src/app/api/employees/profile-image/route-old.ts

# Use new Supabase route
mv src/app/api/employees/profile-image/route-supabase.ts src/app/api/employees/profile-image/route.ts
```

### 6. Migrate Existing Images (Optional)

If you have existing images in `public/uploads/profiles/`, create a migration script:

```javascript
// scripts/migrate-images-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const prisma = new PrismaClient();

async function migrateImages() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
  
  try {
    const files = await fs.readdir(uploadsDir);
    console.log(`Found ${files.length} images to migrate`);

    for (const file of files) {
      const employeeId = file.split('.')[0];
      const filePath = path.join(uploadsDir, file);
      const fileBuffer = await fs.readFile(filePath);
      
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(`profiles/${file}`, fileBuffer, {
          contentType: `image/${path.extname(file).slice(1)}`,
          upsert: true
        });

      if (error) {
        console.error(`Failed to upload ${file}:`, error);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(`profiles/${file}`);

      // Update database
      await prisma.employee.update({
        where: { employeeId },
        data: { profileImage: urlData.publicUrl }
      });

      console.log(`✓ Migrated ${file}`);
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateImages();
```

Run the migration:
```bash
node scripts/migrate-images-to-supabase.js
```

### 7. Deploy to Vercel

1. Add environment variables in Vercel Dashboard → Settings → Environment Variables
2. Deploy the updated code
3. Test profile image upload/view functionality

## Key Changes

### Before (Local Storage)
- Images saved to `public/uploads/profiles/`
- URL format: `/uploads/profiles/{employeeId}.{ext}`
- Files lost on Vercel redeployment
- Limited to single server

### After (Supabase Storage)
- Images saved to Supabase bucket
- URL format: `https://{project}.supabase.co/storage/v1/object/public/profile-images/profiles/{employeeId}.{ext}`
- Persistent across deployments
- CDN-backed, globally distributed
- Automatic backups

## Benefits

✅ **Persistent Storage**: Images survive deployments  
✅ **Scalable**: No server disk space limits  
✅ **CDN**: Fast global delivery  
✅ **Secure**: Fine-grained access policies  
✅ **Cost-effective**: Free tier includes 1GB storage  

## Troubleshooting

### Images not loading
- Check bucket is set to **Public**
- Verify storage policies are created
- Check browser console for CORS errors

### Upload fails
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check file size (default 5MB limit)
- Ensure bucket name matches (`profile-images`)

### Database not updating
- Check `DATABASE_URL` is correct
- Verify employee exists with that `employeeId`
- Check Prisma schema has `profileImage` field

## Rollback

To revert to local storage:

```bash
mv src/app/api/employees/profile-image/route.ts src/app/api/employees/profile-image/route-supabase.ts
mv src/app/api/employees/profile-image/route-old.ts src/app/api/employees/profile-image/route.ts
```

## Support

- Supabase Docs: https://supabase.com/docs/guides/storage
- Storage API: https://supabase.com/docs/reference/javascript/storage-from-upload
