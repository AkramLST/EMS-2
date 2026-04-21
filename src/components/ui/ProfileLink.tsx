import Link from "next/link";
import { UserIcon } from "@heroicons/react/24/outline";

interface ProfileLinkProps {
  employeeId: string;
  variant?: "button" | "icon" | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Universal Profile Link Component
 * Links to the universal profile page with proper employee ID parameter
 *
 * @param employeeId - The employee ID to link to
 * @param variant - How to display the link: "button", "icon", or "text"
 * @param size - Size of the link element
 * @param className - Additional CSS classes
 * @param children - Custom content for the link
 */
export default function ProfileLink({
  employeeId,
  variant = "button",
  size = "md",
  className = "",
  children
}: ProfileLinkProps) {
  const baseUrl = `/dashboard/profile?id=${encodeURIComponent(employeeId)}`;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };

  const variantClasses = {
    button: "inline-flex items-center font-medium rounded transition-colors",
    icon: "inline-flex items-center justify-center rounded transition-colors",
    text: "inline-flex items-center underline hover:no-underline transition-all"
  };

  const defaultContent = {
    button: (
      <>
        <UserIcon className="h-4 w-4 mr-2" />
        View Profile
      </>
    ),
    icon: <UserIcon className="h-4 w-4" />,
    text: "View Profile"
  };

  return (
    <Link
      href={baseUrl}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      title="View employee profile"
    >
      {children || defaultContent[variant]}
    </Link>
  );
}

// Helper function for creating profile URLs
export const getProfileUrl = (employeeId: string, tab?: string) => {
  const baseUrl = `/dashboard/profile?id=${encodeURIComponent(employeeId)}`;
  return tab ? `${baseUrl}&tab=${tab}` : baseUrl;
};

// Usage examples:
// <ProfileLink employeeId="EMP001" variant="button" />
// <ProfileLink employeeId="EMP001" variant="icon" size="sm" className="text-blue-600" />
// <ProfileLink employeeId="EMP001" variant="text">Custom Profile Link</ProfileLink>
