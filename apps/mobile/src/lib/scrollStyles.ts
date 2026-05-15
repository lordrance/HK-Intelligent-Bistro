import { Platform, type ViewStyle } from "react-native";

import { T } from "@/theme/tokens";

/** Flex-fill scroll area; on web prefer overflow scroll so scrollbars can appear. */
export function scrollViewFill(): ViewStyle {
  if (Platform.OS === "web") {
    return { flex: 1, minHeight: 0, overflow: "scroll", backgroundColor: T.bg } as ViewStyle;
  }
  return { flex: 1 };
}
