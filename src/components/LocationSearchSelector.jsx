import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, Navigation, Check, X, Loader2 } from 'lucide-react';

export default function LocationSearchSelector({
  value = '',
  onSelect = () => {},
  placeholder = 'Search hospital, locality, landmark, or PIN code...',
  className = '',
  required = false
}) {
  const [inputValue, setInputValue] = useState(typeof value === 'string' ? value : value?.name || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Sync internal input value if prop changes
  useEffect(() => {
    if (typeof value === 'string') {
      setInputValue(value);
    } else if (value && value.name) {
      setInputValue(value.name);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!inputValue || inputValue.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/map/geocode?query=${encodeURIComponent(inputValue.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = (item) => {
    setInputValue(item.name);
    setIsOpen(false);
    onSelect(item);
  };

  const handleClear = () => {
    setInputValue('');
    setResults([]);
    setIsOpen(false);
    onSelect(null);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-16 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Clear location"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 divide-y divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 text-xs font-semibold text-slate-400 bg-slate-950/80 uppercase tracking-wider flex items-center justify-between">
            <span>Verified Hospitals & Localities</span>
            <span className="text-[10px] text-slate-400">{results.length} found</span>
          </div>
          {results.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const isHospital = item.facility_type?.includes('HOSPITAL') || item.facility_type?.includes('INSTITUTE') || item.facility_type?.includes('CENTER');

            return (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-rose-950/40 text-rose-200' : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-md ${
                  isHospital ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {isHospital ? <Building2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-100 truncate">
                      {item.name}
                    </span>
                    {item.postal_code && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        PIN {item.postal_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{item.locality}</span>
                    <span>•</span>
                    <span>{item.city}, {item.state}</span>
                  </div>
                  {item.latitude && item.longitude && (
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      📍 {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
