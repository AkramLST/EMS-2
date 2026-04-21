# Dynamic Authorization System - Quick Setup Script (PowerShell)
# Run this script to set up the dynamic role-permission system

Write-Host "🔐 Dynamic Authorization System Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Next.js dev server if running
Write-Host "📍 Step 1: Stopping development server..." -ForegroundColor Yellow
Write-Host "⚠️  Please manually stop your Next.js dev server (Ctrl+C) before continuing" -ForegroundColor Red
Read-Host "Press Enter when server is stopped"

# Step 2: Generate Prisma Client
Write-Host ""
Write-Host "📍 Step 2: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client. Please close your dev server and try again." -ForegroundColor Red
    exit 1
}

# Step 3: Run Database Migration
Write-Host ""
Write-Host "📍 Step 3: Running database migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_role_permissions

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed. Please check your database connection." -ForegroundColor Red
    exit 1
}

# Step 4: Seed Role Permissions
Write-Host ""
Write-Host "📍 Step 4: Seeding role permissions..." -ForegroundColor Yellow
npx tsx scripts/seed-role-permissions.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Seeding failed. Please check the error above." -ForegroundColor Red
    exit 1
}

# Success
Write-Host ""
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start your development server: npm run dev"
Write-Host "   2. Navigate to: http://localhost:3000/dashboard/admin/permissions"
Write-Host "   3. Login as ADMINISTRATOR to configure permissions"
Write-Host ""
Write-Host "📖 For more information, see: DYNAMIC_AUTHORIZATION_GUIDE.md" -ForegroundColor Gray
