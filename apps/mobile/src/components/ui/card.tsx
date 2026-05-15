import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("overflow-hidden rounded-bistro border border-bistro-line bg-bistro-glass", className)}
      {...props}
    />
  );
}
