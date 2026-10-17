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
  placement?: "bottom" | "top";
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
  align,
  placement,
  title,
  accentColor = "teal",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [computedPlacement, setComputedPlacement] = useState<"bottom" | "top">(placement || "bottom");
  const [computedAlign, setComputedAlign] = useState<"left" | "right">(align || "left");

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    // Detect optimal vertical placement (top vs bottom)
    if (placement) {
      setComputedPlacement(placement);
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollParent = buttonRef.current.closest(".overflow-y-auto");
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceBelowInParent = parentRect.bottom - rect.bottom;
        const spaceAboveInParent = rect.top - parentRect.top;
        if (spaceBelowInParent < 260 && spaceAboveInParent > spaceBelowInParent) {
          setComputedPlacement("top");
        } else {
          setComputedPlacement("bottom");
        }
      } else {
        const spaceBelowWindow = window.innerHeight - rect.bottom;
        if (spaceBelowWindow < 260 && rect.top > 260) {
          setComputedPlacement("top");
        } else {
          setComputedPlacement("bottom");
        }
      }
    }

    // Detect optimal horizontal alignment (left vs right to prevent horizontal overflow)
    if (align) {
      setComputedAlign(align);
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollParent = buttonRef.current.closest(".overflow-y-auto") || document.body;
      const parentRect = scrollParent.getBoundingClientRect();
      if (parentRect.right - rect.left < 220) {
        setComputedAlign("right");
      } else {
        setComputedAlign("left");
      }
    }
  }, [isOpen, placement, align]);

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
        ref={buttonRef}
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
          <span
            className={cn(
              "truncate font-semibold",
              selectedOption ? "text-slate-800" : "text-slate-400 font-normal"
            )}
          >
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
            "absolute z-50 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 overflow-hidden animate-in fade-in duration-150",
            computedPlacement === "top"
              ? "bottom-full mb-1.5 slide-in-from-bottom-1"
              : "top-full mt-1.5 slide-in-from-top-1",
            "min-w-full w-max max-w-xs sm:max-w-sm",
            computedAlign === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          <div className="max-h-64 overflow-y-auto overscroll-contain divide-y divide-slate-100/70 p-1">
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
                    "w-full text-left rounded-lg text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer",
                    size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2",
                    isSelected
                      ? accentColor === "blue"
                        ? "bg-blue-50/90 text-blue-950 font-bold"
                        : "bg-teal-50/90 text-teal-950 font-bold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "font-semibold leading-tight",
                          isSelected
                            ? accentColor === "blue"
                              ? "text-blue-900"
                              : "text-teal-900"
                            : "text-slate-800"
                        )}
                      >
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div
                          className={cn(
                            "text-[11px] font-normal leading-normal mt-0.5",
                            isSelected
                              ? accentColor === "blue"
                                ? "text-blue-600/80"
                                : "text-teal-700/80"
                              : "text-slate-400"
                          )}
                        >
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
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
