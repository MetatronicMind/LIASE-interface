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
        className="w-full px-4 py-3 border border-blue-700 rounded-lg text-sm bg-white text-blue-900 text-left focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors font-semibold"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? selected.label : (placeholder || "Select...")}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-blue-700 rounded-lg shadow-lg">
          <input
            type="text"
            className="w-full px-3 py-2 border-b border-blue-200 text-sm focus:outline-none text-blue-900 placeholder-blue-400 font-semibold"
            placeholder="Type to search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-2 text-gray-400 text-sm">No results</li>
            )}
            {filtered.map(opt => (
              <li
                key={opt.value}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-700 hover:text-white text-sm ${opt.value === value ? "bg-blue-100 text-blue-900 font-bold" : "text-blue-900"}`}
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
