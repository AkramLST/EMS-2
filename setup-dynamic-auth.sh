#!/bin/bash

# Dynamic Authorization System - Quick Setup Script
# Run this script to set up the dynamic role-permission system

echo "🔐 Dynamic Authorization System Setup"
echo "====================================="
echo ""

# Step 1: Stop Next.js dev server if running
echo "📍 Step 1: Stopping development server..."
echo "⚠️  Please manually stop your Next.js dev server (Ctrl+C) before continuing"
read -p "Press Enter when server is stopped..."

# Step 2: Generate Prisma Client
echo ""
echo "📍 Step 2: Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client. Please close your dev server and try again."
    exit 1
fi

# Step 3: Run Database Migration
echo ""
echo "📍 Step 3: Running database migration..."
npx prisma migrate dev --name add_role_permissions

if [ $? -ne 0 ]; then
    echo "❌ Migration failed. Please check your database connection."
    exit 1
fi

# Step 4: Seed Role Permissions
echo ""
echo "📍 Step 4: Seeding role permissions..."
npx tsx scripts/seed-role-permissions.ts

if [ $? -ne 0 ]; then
    echo "❌ Seeding failed. Please check the error above."
    exit 1
fi

# Success
echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🎉 Next steps:"
echo "   1. Start your development server: npm run dev"
echo "   2. Navigate to: http://localhost:3000/dashboard/admin/permissions"
echo "   3. Login as ADMINISTRATOR to configure permissions"
echo ""
echo "📖 For more information, see: DYNAMIC_AUTHORIZATION_GUIDE.md"
