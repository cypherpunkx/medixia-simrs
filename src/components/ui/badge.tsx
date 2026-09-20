import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 whitespace-nowrap leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-teal-600 text-white shadow-xs hover:bg-teal-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
        outline: "border-slate-300 text-slate-800",
        // Clinical Variants
        staging:
          "border-amber-300 bg-amber-50 text-amber-900 font-bold",
        production:
          "border-emerald-300 bg-emerald-50 text-emerald-900 font-bold",
        fhir:
          "border-sky-300 bg-sky-50 text-sky-900 font-bold",
        kemenkes:
          "border-teal-300 bg-teal-50 text-teal-950 font-bold",
        purple:
          "border-purple-200 bg-purple-100 text-purple-800 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
