/**
 * Secure cookie management utilities
 */

/**
 * Sets a secure authentication token cookie
 * @param token - The JWT token to store
 * @param maxAge - Cookie expiration time in seconds (default: 7 days)
 */
export function setAuthTokenCookie(
  token: string,
  maxAge: number = 7 * 24 * 60 * 60
): void {
  // Create cookie string with enhanced security flags
  // Removing Secure flag for development environment
  const isProduction = process.env.NODE_ENV === "production";
  let cookieString = `auth-token=${token}; path=/; max-age=${maxAge}; HttpOnly; SameSite=Lax`;

  // Only add Secure flag in production environment
  if (isProduction) {
    cookieString += "; Secure";
  }

  console.log("[Cookies] Setting cookie:", cookieString);
  document.cookie = cookieString;
}

/**
 * Clears the authentication token cookie
 */
export function clearAuthTokenCookie(): void {
  // Clear cookie with all security flags
  const isProduction = process.env.NODE_ENV === "production";
  let cookieString =
    "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Lax";

  // Only add Secure flag in production environment
  if (isProduction) {
    cookieString += "; Secure";
  }

  console.log("[Cookies] Clearing cookie:", cookieString);
  document.cookie = cookieString;
}

/**
 * Gets a cookie value by name
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
