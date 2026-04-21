"use client";

import { useState, useEffect } from "react";
import {
  setAuthTokenCookie,
  getCookie,
  clearAuthTokenCookie,
} from "@/lib/cookies";

export default function TestCookiesPage() {
  const [tokenValue, setTokenValue] = useState("");
  const [cookieValue, setCookieValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Check existing cookie on load
    const existingToken = getCookie("auth-token");
    if (existingToken) {
      setCookieValue(existingToken.substring(0, 20) + "...");
    }
  }, []);

  const handleSetCookie = () => {
    try {
      setAuthTokenCookie(tokenValue);
      setMessage("Cookie set successfully");
      // Check if it was set
      const newToken = getCookie("auth-token");
      if (newToken) {
        setCookieValue(newToken.substring(0, 20) + "...");
      }
    } catch (error) {
      setMessage(
        "Error setting cookie: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleClearCookie = () => {
    try {
      clearAuthTokenCookie();
      setCookieValue("");
      setMessage("Cookie cleared successfully");
    } catch (error) {
      setMessage(
        "Error clearing cookie: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleCheckCookie = () => {
    const token = getCookie("auth-token");
    if (token) {
      setCookieValue(token.substring(0, 20) + "...");
      setMessage("Cookie found");
    } else {
      setCookieValue("");
      setMessage("No cookie found");
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Cookie Debug Test</h1>

      <div className="mb-6">
        <label className="block mb-2">Token Value:</label>
        <input
          type="text"
          value={tokenValue}
          onChange={(e) => setTokenValue(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Enter token value"
        />
        <button
          onClick={handleSetCookie}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Set Auth Cookie
        </button>
      </div>

      <div className="mb-6">
        <p className="mb-2">Current Cookie Value: {cookieValue || "None"}</p>
        <div className="space-x-2">
          <button
            onClick={handleCheckCookie}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Check Cookie
          </button>
          <button
            onClick={handleClearCookie}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Cookie
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-gray-100 rounded">
          <p>Message: {message}</p>
        </div>
      )}
    </div>
  );
}
