import React, { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder, className }: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className || ""}`.trim()}>
      <button
        type="button"
        className="w-full px-4 py-3 border border-blue-700 dark:border-blue-900 rounded-lg text-sm bg-white dark:bg-[#101624] text-blue-900 dark:text-blue-100 text-left focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-400 focus:border-blue-700 dark:focus:border-blue-400 transition-colors font-semibold"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? selected.label : (placeholder || "Select...")}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#101624] border border-blue-700 dark:border-blue-900 rounded-lg shadow-lg">
          <input
            type="text"
            className="w-full px-3 py-2 border-b border-blue-200 dark:border-blue-900 text-sm focus:outline-none text-blue-900 dark:text-blue-100 placeholder-blue-400 dark:placeholder-blue-300 font-semibold bg-white dark:bg-[#101624]"
            placeholder="Type to search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-2 text-gray-400 dark:text-gray-500 text-sm">No results</li>
            )}
            {filtered.map(opt => (
              <li
                key={opt.value}
                className={`px-4 py-2 cursor-pointer text-sm transition-colors
                  ${opt.value === value
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-bold"
                    : "text-blue-900 dark:text-blue-100 hover:bg-blue-700 dark:hover:bg-blue-800 hover:text-white"}
                `}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch("");
                }}
                role="option"
                aria-selected={opt.value === value}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
