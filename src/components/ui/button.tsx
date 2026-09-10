import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,opacity,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg shadow-[var(--shadow-border)]",
        secondary: "bg-surface text-fg shadow-[var(--shadow-border)]",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        danger: "bg-danger text-primary-fg",
        outline: "bg-transparent text-fg shadow-[var(--shadow-border)]",
      },
      size: {
        md: "min-h-12 rounded-xl px-4 text-base",
        sm: "min-h-10 rounded-lg px-3 text-sm",
        icon: "size-12 rounded-xl",
        iconSm: "size-10 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
