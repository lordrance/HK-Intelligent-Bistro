import * as React from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { cn } from "@/lib/utils";

export type InputProps = TextInputProps & {
  className?: string;
  containerClassName?: string;
};

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <View className={cn("rounded-lg border border-bistro-line bg-bistro-glass px-3 py-2", containerClassName)}>
        <TextInput
          ref={ref}
          className={cn("min-h-[40px] w-full text-base text-bistro-text", className)}
          placeholderTextColor="rgba(255,255,255,0.35)"
          {...props}
        />
      </View>
    );
  },
);
Input.displayName = "Input";
