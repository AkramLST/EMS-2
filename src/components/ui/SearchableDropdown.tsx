"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { Combobox, Transition } from "@headlessui/react";
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

interface SearchableDropdownProps {
  options: Option[];
  selected: Option | null;
  onChange: (value: Option | null) => void;
  placeholder?: string;
  loading?: boolean;
  onSearch?: (query: string) => void;
  onCreateNew?: (query: string) => void;
  creatable?: boolean;
}

export default function SearchableDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  loading = false,
  onSearch,
  onCreateNew,
  creatable = false,
}: SearchableDropdownProps) {
  const [query, setQuery] = useState("");

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
      <Combobox value={selected} onChange={onChange}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
            <Combobox.Input
              className="input w-full py-2 pl-3 pr-10 text-sm leading-5 focus:ring-0"
              displayValue={(option: Option | null) => option?.title || ""}
              onChange={handleSearchChange}
              placeholder={placeholder}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 shadow-md ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {/* Search input at the top of dropdown */}
              <div className="sticky top-0 bg-gray-50 p-2 border-b border-gray-200 z-10">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input w-full py-1 pl-8 pr-2 text-sm bg-white"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search..."
                  />
                </div>
              </div>

              <div className="pt-1">
                {loading ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Loading...
                  </div>
                ) : filteredOptions.length === 0 && query !== "" ? (
                  creatable && onCreateNew ? (
                    <div
                      className="relative cursor-pointer select-none py-2 px-4 text-gray-700 hover:bg-primary-100"
                      onClick={() => onCreateNew(query)}
                    >
                      Create "{query}"
                    </div>
                  ) : (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      Nothing found.
                    </div>
                  )
                ) : filteredOptions.length === 0 && query === "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    No options available.
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Combobox.Option
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
                    </Combobox.Option>
                  ))
                )}
              </div>
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
