import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { prisma } from "./prisma";
import {
  hasPermission as checkPermission,
  Permission,
  canAccessResource,
} from "./permissions";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  // Generate JWT token with 7-day expiration
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
  return token;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // Check if token is properly formatted
    if (!token || typeof token !== "string") {
      return null;
    }

    // Check if token looks like a JWT (should have 3 parts separated by dots)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(request?: NextRequest) {
  // Check if we're in build mode or have no database access
  if (!process.env.DATABASE_URL) {
    return null;
  }

  // Test database connectivity before proceeding
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (dbError) {
    return null;
  }

  // Only check cookies since we're using HttpOnly cookies
  const tokenFromCookie = request
    ? request.cookies.get("auth-token")?.value
    : nextCookies().get("auth-token")?.value;

  const token = tokenFromCookie;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      employee: {
        include: {
          department: true,
          manager: true,
          designation: true,
        },
      },
      roles: true, // Include all user roles
    },
  });

  if (user?.employee?.status && ["INACTIVE", "TERMINATED"].includes(user.employee.status)) {
    return null;
  }

  return user;
}

export function hasPermission(user: any, permission: Permission): boolean {
  // If user has a roles array (multiple roles) and it's not empty, check all of them
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    const hasPerm = user.roles.some((userRole: any) =>
      checkPermission(userRole.role || userRole, permission)
    );

    return hasPerm;
  }

  // If user only has a single role or empty roles array, check that role
  const hasPerm = checkPermission(user.role, permission);

  return hasPerm;
}

export function userCanAccessResource(
  userRole: string,
  permission: Permission,
  resourceUserId?: string,
  currentUserId?: string
): boolean {
  return canAccessResource(userRole, permission, resourceUserId, currentUserId);
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission,
  resourceUserId?: string
) {
  const user = await getAuthUser(request);

  if (!user) {
    return {
      error: { message: "Unauthorized" },
      status: 401,
    };
  }

  // Check if user has the required permission
  if (!hasPermission(user, permission)) {
    return {
      error: { message: "Insufficient permissions" },
      status: 403,
    };
  }

  // If a specific resource user ID is provided, check if user can access it
  // We need to check if any of the user's roles can access the resource
  if (resourceUserId) {
    let canAccess = false;

    // Check all user roles
    if (user.roles && Array.isArray(user.roles)) {
      canAccess = user.roles.some((userRole: any) =>
        canAccessResource(
          userRole.role || userRole,
          permission,
          resourceUserId,
          user.id
        )
      );
    } else {
      // Check primary role
      canAccess = canAccessResource(
        user.role,
        permission,
        resourceUserId,
        user.id
      );
    }

    if (!canAccess) {
      return {
        error: { message: "Insufficient permissions" },
        status: 403,
      };
    }
  }

  return { user, status: 200 };
}
