# 🔐 Dynamic Role-Based Authorization System

## Overview

This system provides a **fully dynamic, database-driven role-permission management** system with an intuitive admin interface. No more hardcoded permissions - everything is configurable through the UI!

## 🎯 Features

✅ **Dynamic Permission Management** - Configure role permissions via UI  
✅ **Database-Driven** - All permissions stored in PostgreSQL  
✅ **Admin-Only Access** - Protected by `system.admin` permission  
✅ **Real-time Updates** - Changes take effect with 5-minute cache  
✅ **Checkbox Interface** - Easy-to-use permission configuration  
✅ **Role-Based Access** - 6 predefined roles with custom permissions  
✅ **Audit Trail** - All changes logged for compliance  
✅ **Reset to Default** - Restore original permissions anytime  
✅ **Permission Categories** - Organized by functional modules

---

## 📁 Files Created/Modified

### 1. **Database Schema**

- **File**: `prisma/schema.prisma`
- **Added**: `RolePermission` model

```prisma
model RolePermission {
  id         String   @id @default(cuid())
  role       Role
  permission String
  isEnabled  Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([role, permission])
  @@index([role])
  @@map("role_permissions")
}
```

### 2. **API Endpoints**

- **File**: `src/app/api/admin/role-permissions/route.ts`
- **Methods**:
  - `GET` - Fetch all role permissions
  - `PUT` - Update role permissions
  - `POST` - Reset role to default permissions

### 3. **Admin UI Page**

- **File**: `src/app/dashboard/admin/permissions/page.tsx`
- **Features**:
  - Role selector sidebar
  - Permission checkboxes grouped by category
  - Search functionality
  - Save/Reset controls
  - Real-time validation

### 4. **Permission Service**

- **File**: `src/lib/permissions.ts`
- **Added Functions**:
  - `loadRolePermissionsFromDB()` - Load from database with caching
  - `clearPermissionCache()` - Clear cache after updates
  - `hasPermissionAsync()` - Async permission check

### 5. **Seed Script**

- **File**: `scripts/seed-role-permissions.ts`
- **Purpose**: Migrate hardcoded permissions to database

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_role_permissions
```

This creates the `role_permissions` table in your database.

### Step 2: Seed Initial Permissions

```bash
npx tsx scripts/seed-role-permissions.ts
```

This populates the database with default permissions from `ROLE_PERMISSIONS`.

**Expected Output:**

```
🔐 Starting role permissions seeding...

📋 Processing role: ADMINISTRATOR
   Found 95 permissions for ADMINISTRATOR
   ✓ Created: system.admin
   ✓ Created: employee.create
   ...

✅ Created:  570 permissions
🔄 Updated:  0 permissions
⏭️  Skipped:  0 permissions
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Access the Admin Page

Navigate to: **`/dashboard/admin/permissions`**

**Requirements:**

- Must be logged in as `ADMINISTRATOR` role
- Must have `system.admin` permission

---

## 🎨 Using the Admin Interface

### Role Selection

1. Click on any role in the left sidebar
2. View current permissions for that role
3. See permission count and description

### Configure Permissions

1. Use search bar to filter permissions
2. Check/uncheck permissions to enable/disable
3. Changes are highlighted with warning banner
4. Click **"Save Changes"** to apply

### Reset to Default

1. Click **"Reset to Default"** button
2. Confirm the action
3. Role permissions restored to original values

### Permission Categories

Permissions are grouped by module:

- 👥 Employee Management
- 🏢 Department Management
- 📅 Attendance Management
- 🌴 Leave Management
- 💰 Payroll Management
- ⭐ Performance Management
- 📚 Training Management
- 📊 Reports & Analytics
- ⚙️ System Settings
- 👤 User Management
- 📢 Announcements
- ✅ Task Management
- 🔒 Compliance & Auditing
- 📦 Inventory & Assets
- 🛡️ System Administration

---

## 🔧 Technical Details

### Permission Caching

- **Cache Duration**: 5 minutes
- **Automatic Refresh**: Permissions reload after cache expires
- **Manual Refresh**: Call `clearPermissionCache()` after updates

### Database Structure

```typescript
{
  id: string,           // Unique identifier
  role: Role,           // ADMINISTRATOR, HR_MANAGER, etc.
  permission: string,   // e.g., "employee.create"
  isEnabled: boolean,   // true/false
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### API Usage Examples

**Fetch All Permissions:**

```javascript
const response = await fetch("/api/admin/role-permissions");
const data = await response.json();
// Returns: { rolePermissions, allPermissions, rawData }
```

**Update Permissions:**

```javascript
const response = await fetch('/api/admin/role-permissions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'EMPLOYEE',
    permissions: ['employee.read', 'attendance.submit_own', ...]
  })
});
```

**Reset to Default:**

```javascript
const response = await fetch("/api/admin/role-permissions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "EMPLOYEE" }),
});
```

---

## 🛡️ Security Features

### Admin-Only Access

- All endpoints check for `system.admin` permission
- Unauthorized requests return `403 Forbidden`
- Page automatically redirects non-admin users

### Audit Logging

Every permission change is logged:

```typescript
{
  action: 'UPDATE',
  resource: 'role_permissions',
  resourceId: 'EMPLOYEE',
  details: 'Updated permissions for role EMPLOYEE...',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
}
```

### Validation

- Role validation against enum values
- Permission validation against defined list
- Array structure validation
- Duplicate prevention with unique constraints

---

## 📊 Available Roles

| Role                   | Emoji | Hierarchy | Default Permissions               |
| ---------------------- | ----- | --------- | --------------------------------- |
| **ADMINISTRATOR**      | 👑    | Level 6   | 95+ permissions (Full control)    |
| **HR_MANAGER**         | 🧑‍💼    | Level 4   | 60+ permissions (HR operations)   |
| **DEPARTMENT_MANAGER** | 📊    | Level 2   | 30+ permissions (Team management) |
| **EMPLOYEE**           | 👩‍💻    | Level 1   | 15+ permissions (Self-service)    |
| **PAYROLL_OFFICER**    | 🧮    | Level 3   | 40+ permissions (Finance focused) |
| **SYSTEM_AUDITOR**     | 🔒    | Level 5   | 50+ permissions (Read-only)       |

---

## 🧪 Testing

### Test Permission Loading

```typescript
import { loadRolePermissionsFromDB } from "@/lib/permissions";

const permissions = await loadRolePermissionsFromDB();
console.log(permissions.EMPLOYEE); // Array of permissions
```

### Test Permission Check

```typescript
import { hasPermissionAsync } from "@/lib/permissions";

const canCreate = await hasPermissionAsync("EMPLOYEE", "employee.create");
console.log(canCreate); // false
```

### Clear Cache (After Updates)

```typescript
import { clearPermissionCache } from "@/lib/permissions";

clearPermissionCache(); // Force reload on next check
```

---

## 🔄 Migration from Hardcoded Permissions

The system maintains **backward compatibility**:

1. **Fallback to Hardcoded**: If database is unavailable, uses `ROLE_PERMISSIONS`
2. **Gradual Migration**: Existing code continues to work
3. **Sync Function**: Use seed script to sync changes

To re-sync after modifying `ROLE_PERMISSIONS`:

```bash
npx tsx scripts/seed-role-permissions.ts
```

---

## 📱 UI Features

### Visual Indicators

- ✅ **Green badges** - Active/enabled permissions
- 🔴 **Red badges** - Inactive/disabled permissions
- ⚠️ **Yellow banner** - Unsaved changes warning

### Search & Filter

- Real-time search across all permissions
- Filters apply to permission names
- Maintains category grouping

### Statistics

- Shows enabled/disabled count per role
- Displays total permissions per category
- Updates in real-time as you check/uncheck

---

## 🚨 Troubleshooting

### Issue: "Insufficient permissions"

**Solution**: Ensure you're logged in as `ADMINISTRATOR` role

### Issue: Changes not taking effect

**Solution**: Wait 5 minutes for cache to expire, or restart the server

### Issue: Seed script fails

**Solution**:

1. Check database connection
2. Ensure Prisma schema is up to date
3. Run `npx prisma generate`

### Issue: UI not loading

**Solution**:

1. Check console for errors
2. Verify API endpoint is accessible
3. Ensure admin user exists

---

## 🎯 Best Practices

1. **Test Changes**: Always test permission changes in development first
2. **Document Custom Permissions**: If adding new permissions, update documentation
3. **Regular Backups**: Backup `role_permissions` table before major changes
4. **Audit Reviews**: Regularly review audit logs for permission changes
5. **Role Hierarchy**: Respect role hierarchy when assigning permissions

---

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review audit logs for permission changes
3. Verify database schema is up to date
4. Test with default permissions using reset function

---

## 🎉 Benefits

✅ **No Code Changes** - Update permissions without deploying  
✅ **Instant Updates** - Changes take effect within 5 minutes  
✅ **User-Friendly** - Non-technical admins can manage permissions  
✅ **Audit Trail** - Complete history of all changes  
✅ **Flexibility** - Adapt to changing business requirements  
✅ **Safety** - Reset to default if something goes wrong

---

**Congratulations! 🎊 You now have a fully dynamic, database-driven authorization system!**
