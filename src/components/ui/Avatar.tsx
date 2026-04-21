import Link from "next/link";
import Image from "next/image";
import { UserIcon } from "@heroicons/react/24/outline";

interface AvatarProps {
  employeeId: string;
  employeeName: string;
  profileImage?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showLink?: boolean;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Centralized Avatar Component
 * Displays profile image with fallback to initials
 * Can optionally link to the employee's profile page
 *
 * @param employeeId - The employee ID for profile linking
 * @param employeeName - Full name for initials fallback
 * @param profileImage - URL or path to profile image (optional)
 * @param size - Size of the avatar
 * @param showLink - Whether to wrap in a link to profile
 * @param className - Additional CSS classes for the avatar container
 * @param fallbackClassName - Additional CSS classes for the fallback initials
 */
export default function Avatar({
  employeeId,
  employeeName,
  profileImage,
  size = "md",
  showLink = false,
  className = "",
  fallbackClassName = "",
}: AvatarProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2);
  };

  // Size configurations
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-xl",
  };
 
  const fallbackSizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  // Get secure profile image URL
  const secureImageUrl = getProfileImageUrl(profileImage);

  const avatarContent = (
    <div className="relative inline-block">
      <div
        className={`rounded-full ${className}`}
        style={{
          boxShadow: '2px 3px 6px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
      >
        {secureImageUrl ? (
          <Image
            src={secureImageUrl}
            alt={`${employeeName}'s profile`}
            width={100}
            height={100}
            className={`rounded-full object-cover ${sizeClasses[size]}`}
            unoptimized={secureImageUrl.startsWith('/uploads')}
            onError={(e) => {
              // Hide broken image and show fallback
              (e.target as HTMLImageElement).style.display = "none";
              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback with initials */}
        <div
          className={`
            ${fallbackSizeClasses[size]}
            rounded-full bg-gray-300 flex items-center justify-center font-medium text-gray-600
            ${secureImageUrl ? "hidden" : "flex"}
            ${fallbackClassName}
          `}
          style={{
            backgroundColor: secureImageUrl ? undefined : "#d1d5db",
          }}
        >
          {getInitials(employeeName)}
        </div>
      </div>
    </div>
  );

  if (showLink) {
    return (
      <Link
        href={`/dashboard/profile?id=${encodeURIComponent(employeeId)}`}
        className="inline-block hover:opacity-80 transition-opacity"
        title={`View ${employeeName}'s profile`}
      >
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
}

// Helper function to get profile image URL with security measures
export const getProfileImageUrl = (profileImage?: string | null) => {
  if (!profileImage) return null;

  // Security: Only allow specific domains for external URLs
  if (profileImage.startsWith("http")) {
    try {
      const url = new URL(profileImage);
      const allowedDomains = [
        'localhost',
        '127.0.0.1',
        process.env.NEXT_PUBLIC_DOMAIN,
        process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined,
        process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined,
        // Add other trusted domains here
      ].filter(Boolean);
      
      if (!allowedDomains.includes(url.hostname)) {
        console.warn(`Avatar: Blocked external URL from untrusted domain: ${url.hostname}`);
        return null;
      }
      return profileImage;
    } catch (error) {
      console.warn('Avatar: Invalid URL provided:', profileImage);
      return null;
    }
  }

  // Security: Sanitize relative paths
  const sanitizedPath = profileImage.replace(/\.\./g, '').replace(/\/+/g, '/');
  
  // Security: Only allow image file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = allowedExtensions.some(ext => 
    sanitizedPath.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    console.warn('Avatar: Invalid file extension:', profileImage);
    return null;
  }

  // If it's a relative path, prepend the base URL
  return `${process.env.NEXT_PUBLIC_BASE_URL || ""}${sanitizedPath}`;
};

// Usage examples:
// <Avatar employeeId="EMP001" employeeName="John Doe" size="md" showLink />
// <Avatar employeeId="EMP001" employeeName="John Doe" profileImage="/images/john.jpg" size="lg" />
// <Avatar employeeId="EMP001" employeeName="John Doe" size="sm" className="ring-2 ring-blue-500" />
