import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-surface text-ink border border-line-2 hover:bg-bg-2",
        primary:
          "bg-ink text-bg hover:opacity-90 dark:bg-accent dark:text-[#0a0e1a] shadow-sm",
        subtle: "bg-bg-2 text-ink hover:bg-line-2",
        ghost: "text-ink hover:bg-line",
        danger: "bg-bad text-white hover:opacity-90 dark:text-[#0a0e1a]",
        link: "text-accent underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-7 px-2.5 text-[11.5px] rounded-md",
        md: "h-8 px-3 text-[12.5px] rounded-lg",
        lg: "h-10 px-4 text-[14px] rounded-lg",
        icon: "h-8 w-8 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, asChild, ...props }, ref) {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export { buttonVariants };
