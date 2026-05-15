import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Pressable, Text, type PressableProps } from "react-native";

import { cn } from "@/lib/utils";

const buttonVariants = cva("flex-row items-center justify-center rounded-lg active:opacity-85", {
  variants: {
    variant: {
      default: "border border-bistro-line bg-bistro-glass",
      outline: "border border-white/20 bg-transparent",
      primary: "border border-bistro-gold/40 bg-bistro-gold",
      destructive: "border border-red-500/35 bg-red-500/15",
    },
    size: {
      default: "min-h-11 px-4 py-2",
      sm: "min-h-9 px-3 py-2",
      lg: "min-h-12 px-6 py-3",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    children: React.ReactNode;
  };

export function Button({ className, variant, size, disabled, children, ...props }: ButtonProps) {
  return (
    <Pressable
      className={cn(buttonVariants({ variant, size }), disabled && "opacity-40", className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}

/** Use inside Button for consistent label styles. */
export function ButtonText({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Text> & { variant?: "default" | "primary" | "destructive" }) {
  const textCls =
    variant === "primary"
      ? "text-center text-sm font-bold text-bistro-bg"
      : variant === "destructive"
        ? "text-center text-sm font-bold text-red-200"
        : "text-center text-sm font-bold text-bistro-text";
  return <Text className={cn(textCls, className)} {...props} />;
}
