"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<T extends string | number = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  prefixIcon?: React.ReactNode;
  prefixLabel?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  title?: string;
  accentColor?: "teal" | "blue";
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  prefixIcon,
  prefixLabel,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
  size = "md",
  align = "left",
  title,
  accentColor = "teal",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-lg border transition-all duration-150 cursor-pointer select-none",
          "outline-none focus:outline-none focus-visible:outline-none",
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70"
            : isOpen
            ? accentColor === "blue"
              ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs text-slate-900"
              : "bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xs text-slate-900"
            : accentColor === "blue"
            ? "bg-slate-50/90 hover:bg-white border-slate-200 hover:border-blue-400 shadow-2xs text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
            : "bg-slate-50/90 hover:bg-white border-slate-200 hover:border-teal-400 shadow-2xs text-slate-700 focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:border-teal-500",
          sizeClasses[size],
          buttonClassName
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {prefixIcon && <span className="shrink-0">{prefixIcon}</span>}
          {prefixLabel && (
            <span className="text-slate-400 font-bold text-[11px] shrink-0">
              {prefixLabel}
            </span>
          )}
          <span className="truncate font-semibold text-slate-800">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200",
            isOpen && (accentColor === "blue" ? "rotate-180 text-blue-600" : "rotate-180 text-teal-600")
          )}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1.5 z-50 min-w-full w-max max-w-xs sm:max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150",
            align === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer",
                    isSelected
                      ? accentColor === "blue"
                        ? "bg-blue-50 text-blue-950 font-bold"
                        : "bg-teal-50 text-teal-950 font-bold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && <span>{opt.badge}</span>}
                    {isSelected && (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          accentColor === "blue" ? "text-blue-600" : "text-teal-600"
                        )}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
