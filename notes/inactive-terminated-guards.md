# Access Guards for Non-Active Employees

- Login route (`src/app/api/auth/login/route.ts`) now rejects users whose `employee.status` is `INACTIVE` or `TERMINATED` with a 403 and guidance message.
- `getAuthUser()` in `src/lib/auth.ts` returns `null` when the associated employee has either status, blocking API/layout access.
- To test: mark an employee as inactive or terminated, attempt login (should fail), and hit `/api/auth/me` while logged in (should redirect to `/login`).
