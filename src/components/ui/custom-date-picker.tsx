"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";

export interface CustomDatePickerPreset {
  label: string;
  getValue: () => string; // returns YYYY-MM-DD
}

export interface CustomDatePickerProps {
  value?: string; // format YYYY-MM-DD or empty
  onChange: (value: string) => void;
  placeholder?: string;
  prefixIcon?: React.ReactNode;
  prefixLabel?: string;
  className?: string;
  buttonClassName?: string;
  popoverClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  title?: string;
  showPresets?: boolean;
  customPresets?: CustomDatePickerPreset[];
  allowClear?: boolean;
  isActive?: boolean;
  variant?: "default" | "filter";
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Helper to format YYYY-MM-DD into Indonesian display string
export function formatDateIndonesian(
  dateStr?: string,
  style: "short" | "medium" | "full" = "medium"
): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);

    if (style === "short") {
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }

    const monthShort = MONTH_NAMES_ID[m - 1]?.slice(0, 3) || "";
    if (style === "medium") {
      return `${String(d).padStart(2, "0")} ${monthShort} ${y}`;
    }

    const dayName = DAY_NAMES_ID[date.getDay()];
    return `${dayName}, ${d} ${MONTH_NAMES_ID[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

export function CustomDatePicker({
  value = "",
  onChange,
  placeholder = "Pilih Tanggal...",
  prefixIcon,
  prefixLabel,
  className = "",
  buttonClassName = "",
  popoverClassName = "",
  disabled = false,
  size = "md",
  align = "left",
  minDate,
  maxDate,
  title,
  showPresets = true,
  customPresets,
  allowClear = true,
  isActive,
  variant = "default",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEffectiveActive =
    isActive !== undefined
      ? isActive
      : variant === "filter" && Boolean(value);

  // Parse current value or fallback to today
  const today = new Date();
  const initialYear = value ? parseInt(value.split("-")[0], 10) : today.getFullYear();
  const initialMonth = value ? parseInt(value.split("-")[1], 10) - 1 : today.getMonth();

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "h-8 text-[11px] px-2.5 py-1",
    md: "h-9 text-xs px-3 py-1.5",
    lg: "h-10 text-xs px-3.5 py-2",
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const selectedDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

    if (minDate && selectedDateStr < minDate) return;
    if (maxDate && selectedDateStr > maxDate) return;

    onChange(selectedDateStr);
    setIsOpen(false);
  };

  // Generate days in month matrix
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Default Presets
  const defaultPresets: CustomDatePickerPreset[] = [
    {
      label: "Hari Ini",
      getValue: () => todayStr,
    },
    {
      label: "Kemarin",
      getValue: () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      },
    },
    {
      label: "7 Hari Lalu",
      getValue: () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      },
    },
    {
      label: "30 Hari Lalu",
      getValue: () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      },
    },
  ];

  const presetsToUse = customPresets || defaultPresets;

  // Year choices for dropdown quick-jump (1920 to currentYear + 5)
  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1920 + 6 }, (_, i) => 1920 + i).reverse();

  return (
    <div
      ref={containerRef}
      className={`relative text-left ${className || "inline-block"}`}
      title={title}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70"
            : isEffectiveActive
            ? "bg-teal-700 text-white border-teal-800 shadow-xs ring-1 ring-teal-500/30 font-extrabold"
            : isOpen
            ? "bg-white border-teal-600 ring-2 ring-teal-500/20 shadow-xs text-slate-900"
            : "bg-slate-50/90 hover:bg-white border-slate-200 hover:border-teal-400 shadow-2xs text-slate-700"
        } ${sizeClasses[size]} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {prefixIcon ? (
            <span className="shrink-0">{prefixIcon}</span>
          ) : (
            <CalendarIcon
              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                isEffectiveActive ? "text-teal-100" : "text-teal-600"
              }`}
            />
          )}

          {prefixLabel && (
            <span
              className={`text-[11px] font-bold shrink-0 transition-colors ${
                isEffectiveActive ? "text-teal-100" : "text-slate-500"
              }`}
            >
              {prefixLabel}
            </span>
          )}

          <span
            className={`truncate font-semibold transition-colors ${
              isEffectiveActive
                ? "text-white font-extrabold"
                : value
                ? "text-slate-900 font-bold"
                : "text-slate-400"
            }`}
          >
            {value ? formatDateIndonesian(value, "medium") : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className={`p-0.5 rounded-full transition-colors ${
                isEffectiveActive
                  ? "text-teal-100 hover:text-white hover:bg-teal-800"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              }`}
              title="Hapus Tanggal"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          } ${popoverClassName}`}
        >
          {/* Calendar Header: Month & Year Controls */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer font-mono"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES_ID.map((day, idx) => (
              <span
                key={day}
                className={`text-[10px] font-extrabold uppercase py-1 ${
                  idx === 0 ? "text-red-500" : "text-slate-400"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous Month Days Filler */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-8 flex items-center justify-center text-xs text-slate-300 font-mono select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const formattedMonth = String(viewMonth + 1).padStart(2, "0");
              const formattedDay = String(day).padStart(2, "0");
              const dateKey = `${viewYear}-${formattedMonth}-${formattedDay}`;

              const isSelected = value === dateKey;
              const isToday = todayStr === dateKey;
              const isDisabled =
                Boolean(minDate && dateKey < minDate) ||
                Boolean(maxDate && dateKey > maxDate);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-lg text-xs font-semibold font-mono flex items-center justify-center transition-all cursor-pointer relative ${
                    isDisabled
                      ? "text-slate-200 cursor-not-allowed"
                      : isSelected
                      ? "bg-teal-700 text-white font-extrabold shadow-sm ring-2 ring-teal-500/30"
                      : isToday
                      ? "bg-teal-50 text-teal-900 border border-teal-300 font-extrabold hover:bg-teal-100"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-teal-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Strip */}
          {showPresets && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Preset Cepat:</span>
                {value && (
                  <span className="text-teal-700 font-mono">
                    {formatDateIndonesian(value, "medium")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {presetsToUse.map((preset) => {
                  const pVal = preset.getValue();
                  const isPresetActive = value === pVal;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        onChange(pVal);
                        setIsOpen(false);
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all truncate text-center cursor-pointer border ${
                        isPresetActive
                          ? "bg-teal-700 text-white border-teal-800 shadow-2xs font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-teal-600" />
              <span>Pilih Hari Ini</span>
            </button>

            <div className="flex items-center gap-1.5">
              {allowClear && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-2xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
