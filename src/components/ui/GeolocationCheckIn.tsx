"use client";

import { useState, useEffect } from "react";
import { MapPinIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface GeolocationCheckInProps {
  onLocationVerified: (location: { lat: number; lng: number }) => void;
  onLocationDenied: () => void;
}

const OFFICE_LOCATIONS = [
  { name: "Main Office", lat: 40.7128, lng: -74.0060, radius: 100 }, // NYC example
  { name: "Branch Office", lat: 34.0522, lng: -118.2437, radius: 150 }, // LA example
];

export default function GeolocationCheckIn({ onLocationVerified, onLocationDenied }: GeolocationCheckInProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"pending" | "checking" | "verified" | "denied" | "outside">("pending");

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const verifyLocation = async () => {
    setIsChecking(true);
    setLocationStatus("checking");

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      setLocationStatus("denied");
      onLocationDenied();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Check if user is within any office location
        const isWithinOffice = OFFICE_LOCATIONS.some(office => {
          const distance = calculateDistance(latitude, longitude, office.lat, office.lng);
          return distance <= office.radius;
        });

        if (isWithinOffice) {
          setLocationStatus("verified");
          toast.success("Location verified! You're at the office.");
          onLocationVerified({ lat: latitude, lng: longitude });
        } else {
          setLocationStatus("outside");
          toast.error("You must be at the office to check in");
          onLocationDenied();
        }
        setIsChecking(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationStatus("denied");
        setIsChecking(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable location services.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("An unknown error occurred while retrieving location.");
            break;
        }
        onLocationDenied();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const getStatusColor = () => {
    switch (locationStatus) {
      case "verified": return "text-green-600";
      case "denied": case "outside": return "text-red-600";
      case "checking": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const getStatusMessage = () => {
    switch (locationStatus) {
      case "checking": return "Verifying your location...";
      case "verified": return "Location verified ✓";
      case "denied": return "Location access denied";
      case "outside": return "You're outside the office area";
      default: return "Location verification required";
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        <MapPinIcon className={`h-6 w-6 ${getStatusColor()}`} />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">Location Verification</h4>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>
        </div>
        
        {locationStatus === "pending" && (
          <button
            onClick={verifyLocation}
            disabled={isChecking}
            className="btn-primary text-sm"
          >
            {isChecking ? "Checking..." : "Verify Location"}
          </button>
        )}
        
        {locationStatus === "outside" && (
          <div className="text-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-red-600">Check-in disabled</p>
          </div>
        )}
      </div>
      
      {locationStatus === "outside" && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">
            You must be within the office premises to check in. If you believe this is an error, 
            please contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
}
