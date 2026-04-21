"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { Toaster } from "react-hot-toast";
import { clearAuthTokenCookie, getCookie } from "@/lib/cookies";
import { useUserSession } from "@/hooks/useUserSession";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";
  const router = useRouter();

  // Initialize user session management
  const { createSession } = useUserSession();

  // Ensure we're mounted before accessing document
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuth = async () => {
      try {
        if (isDev) {
          console.log("[Dashboard Layout] Checking authentication...");
        }

        // Make request to auth/me endpoint which can read the HttpOnly cookie server-side
        const response = await fetch("/api/auth/me", {
          credentials: "include", // Include cookies in the request
          headers: {
            "Content-Type": "application/json",
            // Add cache-busting to prevent stale responses
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (isDev) {
          console.log(
            "[Dashboard Layout] Auth check response status:",
            response.status
          );
        }

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          if (isDev) {
            console.log(
              "[Dashboard Layout] User authenticated successfully:",
              userData.user?.email
            );
          }

          // Create user session for online/offline tracking
          createSession().catch(error => {
            if (isDev) {
              console.error(
                "[Dashboard Layout] Failed to create session:",
                error
              );
            }
          });
        } else {
          if (isDev) {
            console.log(
              "[Dashboard Layout] Auth check failed with status:",
              response.status
            );
          }
          // Redirect to login if not authenticated
          router.push("/login");
        }
      } catch (error) {
        console.error("[Dashboard Layout] Auth check failed:", error);
        // Redirect to login on error
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, mounted, createSession]);

  // Handle server restart scenario - re-check auth if we think we're authenticated but get an error
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user && !loading) {
        // When tab becomes visible again, revalidate auth state
        const checkAuth = async () => {
          try {
            const response = await fetch("/api/auth/me", {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            });

            if (!response.ok) {
              // If we were authenticated but now we're not, redirect to login
              router.push("/login");
            }
          } catch (error) {
            console.error("Revalidation failed:", error);
            router.push("/login");
          }
        };

        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    if (isDev) {
      console.log("[Dashboard Layout] No user, returning null");
    }
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Toaster position="top-right" />
      <Sidebar user={user} />
      <div className="flex flex-col w-0 flex-1 overflow-hidden md:ml-64">
        <Header title="Dashboard" user={user} />
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center text-xs text-gray-500">
            Copyright &copy; <a href="https://linesquaretech.com/" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">Linesquare Technologies</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
