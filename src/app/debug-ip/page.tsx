"use client";

import { useEffect, useState } from "react";

interface IpInfo {
  ipInfo: {
    xForwardedFor: string | null;
    xRealIp: string | null;
    remoteAddress: string | null;
    cfConnectingIp: string | null;
    trueClientIp: string | null;
    xForwardedHost: string | null;
    forwarded: string | null;
    getClientIpAddress: string;
  };
  headers: Record<string, string>;
  url: string;
}

export default function DebugIpPage() {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/debug-ip")
      .then((res) => res.json())
      .then((data) => {
        setIpInfo(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching IP info:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">IP Address Debug Information</h1>

      {ipInfo && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              IP Address Information
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details about the IP address extraction
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Extracted IP Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {ipInfo.ipInfo.getClientIpAddress}
                  </span>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  X-Forwarded-For
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {ipInfo.ipInfo.xForwardedFor || "null"}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">X-Real-IP</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {ipInfo.ipInfo.xRealIp || "null"}
                  </span>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  CF-Connecting-IP
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {ipInfo.ipInfo.cfConnectingIp || "null"}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  True-Client-IP
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {ipInfo.ipInfo.trueClientIp || "null"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
