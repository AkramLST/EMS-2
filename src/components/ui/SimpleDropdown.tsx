"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface Option {
  id: string;
  title: string;
  [key: string]: any; // Allow additional properties
}

interface SimpleDropdownProps {
  options: Option[];
  selected: Option | null;
  onChange: (value: Option | null) => void;
  placeholder?: string;
  loading?: boolean;
  onSearch?: (query: string) => void;
  loadAllOnMount?: boolean; // New prop to control loading all options on mount
}

export default function SimpleDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  loading = false,
  onSearch,
  loadAllOnMount = false, // Default to false to maintain backward compatibility
}: SimpleDropdownProps) {
  const [query, setQuery] = useState("");
  const [allOptionsLoaded, setAllOptionsLoaded] = useState(false);

  // Load all options on mount if loadAllOnMount is true and onSearch is provided
  useEffect(() => {
    if (loadAllOnMount && onSearch && !allOptionsLoaded) {
      onSearch(""); // Load all options by calling onSearch with empty query
      setAllOptionsLoaded(true);
    }
  }, [loadAllOnMount, onSearch, allOptionsLoaded]);

  // Filter options based on search query
  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option.title.toLowerCase().includes(query.toLowerCase())
        );

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    // Call onSearch callback if provided
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="relative">
      <Listbox
        value={selected}
        onChange={(value) => {
          onChange(value);
        }}
      >
        <div className="relative">
          <Listbox.Button className="input w-full py-2 pl-3 pr-10 text-left text-sm">
            <span className="block truncate">
              {selected?.title || (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 w-full overflow-hidden rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {/* Search input at the top of dropdown - sticky header */}
              <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200 z-10">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input w-full py-1 pl-8 pr-2 text-sm bg-white"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search..."
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Scrollable options container */}
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Loading...
                  </div>
                ) : filteredOptions.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nothing found.
                  </div>
                ) : filteredOptions.length === 0 && query === "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    No options available.
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Listbox.Option
                      key={option.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active
                            ? "bg-primary-100 text-primary-900"
                            : "text-gray-900"
                        }`
                      }
                      value={option}
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? "font-medium" : "font-normal"
                            }`}
                          >
                            {option.title}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-primary-600" : "text-primary-600"
                              }`}
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </div>
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
