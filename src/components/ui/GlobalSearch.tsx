"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "employee" | "department" | "leave" | "announcement" | "report";
  url: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (query.length > 2) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "employee": return "👤";
      case "department": return "🏢";
      case "leave": return "📅";
      case "announcement": return "📢";
      case "report": return "📊";
      default: return "📄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "employee": return "bg-blue-100 text-blue-800";
      case "department": return "bg-green-100 text-green-800";
      case "leave": return "bg-yellow-100 text-yellow-800";
      case "announcement": return "bg-purple-100 text-purple-800";
      case "report": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-white border border-gray-200 rounded">
          Ctrl+K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div ref={searchRef} className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="flex items-center border-b border-gray-200 px-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search employees, departments, leaves..."
                className="flex-1 px-4 py-4 text-lg outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={result.url}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getTypeIcon(result.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(result.type)}`}>
                        {result.type}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : query.length > 2 ? (
                <div className="p-8 text-center">
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Type to search across all modules</p>
                  <div className="mt-4 space-y-2 text-xs text-gray-400">
                    <p>• Employees and departments</p>
                    <p>• Leave requests and policies</p>
                    <p>• Announcements and reports</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 flex justify-between">
              <span>Press Ctrl+K to search anytime</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
