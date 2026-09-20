"use client";

import React from "react";
import { LucideIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function ModuleEmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}: ModuleEmptyStateProps) {
  return (
    <div className="ehr-card p-8 sm:p-12 text-center space-y-5 bg-slate-50/50 border border-slate-200 animate-in fade-in duration-300">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
        <Icon className="h-8 w-8" />
      </div>
      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        {actionText && onAction && (
          <div className="pt-3">
            <Button
              type="button"
              onClick={onAction}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold gap-2 shadow-xs cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>{actionText}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
