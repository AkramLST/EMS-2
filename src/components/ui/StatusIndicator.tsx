// Status types for online/offline indicators
export type UserStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

interface StatusIndicatorProps {
  status: UserStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  ONLINE: {
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-100",
    label: "Online",
    pulse: "animate-pulse",
  },
  AWAY: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-100",
    label: "Away",
    pulse: "",
  },
  BUSY: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-100",
    label: "Busy",
    pulse: "",
  },
  OFFLINE: {
    color: "bg-gray-400",
    textColor: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Offline",
    pulse: "",
  },
};

export default function StatusIndicator({
  status,
  size = "md",
  showLabel = false,
  className = "",
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div
          className={`${sizeClasses[size]} ${config.color} rounded-full shadow-sm`}
          title={`${config.label} - ${status}`}
        />
        {showLabel && (
          <span className={`${labelSizeClasses[size]} ${config.textColor} font-medium`}>
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}
