# User Audit Log and Deletion Fixes

## Issues Identified

1. **Missing Audit Logs for User Operations**: The user creation API was not creating audit logs when users were created, unlike the employee creation API which properly created audit logs.

2. **Poor Error Handling in User Deletion**: The user deletion API was not providing specific error messages when failures occurred, making it difficult to diagnose issues.

3. **Missing Reset Token in Employee Creation**: The employee creation API was referencing an undefined [resetToken](file:///d:/AI/employee-management-system/src/app/api/employees/route.ts#L302-L302) variable.

## Fixes Implemented

### 1. Added Audit Log Creation for User Operations

Modified [src/app/api/users/route.ts](file:///d:/AI/employee-management-system/src/app/api/users/route.ts) to include audit log creation for all user operations:

#### User Creation

```javascript
// Create audit log for creation
await tx.auditLog.create({
  data: {
    userId: user.id,
    action: "CREATE",
    resource: "user",
    resourceId: newUser.id,
    details:
      `Created user: ${email}` +
      (newEmployee
        ? ` and employee: ${newEmployee.firstName} ${newEmployee.lastName}`
        : ""),
    ipAddress: getClientIpAddress(request),
    userAgent: request.headers.get("user-agent") || "unknown",
  },
});
```

#### User Update

```javascript
// Create audit log for update
await tx.auditLog.create({
  data: {
    userId: user.id,
    action: "UPDATE",
    resource: "user",
    resourceId: id,
    details:
      `Updated user: ${email}` +
      (updatedEmployee
        ? ` and employee: ${updatedEmployee.firstName} ${updatedEmployee.lastName}`
        : ""),
    ipAddress: getClientIpAddress(request),
    userAgent: request.headers.get("user-agent") || "unknown",
  },
});
```

#### User Deletion

```javascript
// Create audit log for deletion
await tx.auditLog.create({
  data: {
    userId: user.id,
    action: "DELETE",
    resource: "user",
    resourceId: params.id,
    details: `Deleted user: ${deletedUser.email}`,
    ipAddress: getClientIpAddress(request),
    userAgent: request.headers.get("user-agent") || "unknown",
  },
});
```

### 2. Improved Error Handling for User Deletion

Enhanced the DELETE method in [src/app/api/users/route.ts](file:///d:/AI/employee-management-system/src/app/api/users/route.ts) to provide more specific error messages:

```javascript
} catch (error) {
  console.error("Delete user error:", error);

  // Handle specific Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      // Record not found
      return NextResponse.json(
        { message: "User not found or already deleted" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { message: "Failed to delete user. Please try again." },
    { status: 500 }
  );
}
```

### 3. Fixed Missing Reset Token in Employee Creation

Fixed the employee creation API in [src/app/api/employees/route.ts](file:///d:/AI/employee-management-system/src/app/api/employees/route.ts) by adding the missing reset token generation:

```javascript
// Generate reset token for first-time login
const resetToken = generateResetToken();
const resetTokenExp = new Date();
resetTokenExp.setHours(resetTokenExp.getHours() + 24); // Token expires in 24 hours

const newUser = await tx.user.create({
  data: {
    email: data.email,
    password: hashedPassword,
    role: "EMPLOYEE",
    isFirstLogin: true,
    resetToken: resetToken,
    resetTokenExp: resetTokenExp,
  },
});
```

## Verification

Tested the audit log functionality with a simple script that confirmed:

- Audit logs can be created successfully
- The audit log count increases when new logs are added
- Audit logs can be cleaned up properly

## Impact

These changes ensure that:

1. All user operations (create, update, delete) are properly logged in the audit trail
2. User deletion failures provide meaningful error messages
3. Employee creation works correctly with proper reset token generation
4. The system maintains consistent audit logging across all user and employee operations
