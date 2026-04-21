# Universal Employee Profile System

## Overview
The Employee Management System now features a **universal profile page** that can display any employee's profile, not just the currently authenticated user. This creates a single, reusable component for all employee profiles.

## Key Features

### 🔗 Universal Access
- **Own Profile**: `/dashboard/profile` - Shows current user's profile
- **Employee Profile**: `/dashboard/profile?id=EMPLOYEE_ID` - Shows specific employee's profile
- **Permission-Based Access**: Role-based access control (Admin, HR Manager, Department Manager can view all profiles)

### 🛡️ Security & Permissions
- **Role-Based Access**:
  - Administrators: Can view all profiles
  - HR Managers: Can view all profiles
  - Department Managers: Can view all profiles
  - Regular Employees: Can only view their own profile
- **403 Forbidden**: Returned when user lacks permission to view another employee's profile

### 🎨 UI Enhancements
- **View-Only Indicator**: Shows "View Only" badge when viewing other profiles
- **Back Button**: Navigation back to previous page when viewing other profiles
- **Disabled Editing**: Profile image upload and edit features disabled for other profiles
- **Conditional Rendering**: UI elements adapt based on profile ownership

## API Endpoint

### `GET /api/profile`
**Query Parameters:**
- `id` (optional): Employee ID to fetch profile for

**Response:**
```json
{
  "success": true,
  "profile": {
    // Complete employee data with computed fields
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "fullName": "string",
    "age": number,
    "tenure": number,
    "department": {...},
    "designation": {...},
    "leaveBalanceSummary": {...},
    "attendanceStats": {...},
    "recentActivities": [...]
  }
}
```

## Usage Examples

### Frontend Navigation
```tsx
// Link to own profile
<Link href="/dashboard/profile">My Profile</Link>

// Link to specific employee profile
<Link href={`/dashboard/profile?id=${employee.id}`}>
  View Profile
</Link>

// Dynamic navigation helper
const getProfileUrl = (employeeId?: string) =>
  employeeId ? `/dashboard/profile?id=${employeeId}` : '/dashboard/profile';
```

### React Component Usage
```tsx
const ProfilePage = () => {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');
  const isOwnProfile = !employeeId;

  return (
    <div>
      {isOwnProfile ? (
        <h1>My Profile</h1>
      ) : (
        <div>
          <button onClick={() => router.back()}>Back</button>
          <span className="view-only-badge">View Only</span>
        </div>
      )}
    </div>
  );
};
```

## Implementation Details

### Backend Changes
- **Permission Checks**: Role-based access control in API route
- **Dynamic Query**: Optional employee ID parameter handling
- **Error Handling**: Comprehensive error responses for different scenarios
- **Computed Fields**: Calculated age, tenure, and summary statistics

### Frontend Changes
- **URL Parameter Reading**: Uses `useSearchParams` to read employee ID
- **Conditional UI**: Different UI states for own vs. other profiles
- **Navigation**: Back button and profile ownership indicators
- **State Management**: Proper state handling for profile data

## Security Considerations

1. **Authentication Required**: All profile requests require valid authentication
2. **Permission Validation**: Server-side role checking before data access
3. **Data Filtering**: Only authorized users can view sensitive information
4. **Error Handling**: No data leakage in error messages

## Future Enhancements

- **Advanced Permissions**: Department-based access control
- **Profile Sharing**: Temporary profile sharing links
- **Audit Logging**: Track profile view history
- **Profile Templates**: Customizable profile layouts
- **Profile Export**: PDF/Excel profile reports

## Testing

Run the included test file to verify API functionality:
```bash
node test-universal-profile.js
```

## Migration Notes

- **Backward Compatible**: Existing profile links continue to work
- **No Breaking Changes**: All existing functionality preserved
- **Gradual Rollout**: Can be deployed incrementally

---

The universal profile system provides a robust, secure, and user-friendly way to access employee information across the organization.
