import { Platform, useWindowDimensions } from "react-native";

const MAX_CONTENT = 960;
const PAGE_PADDING = 18;
const WIDE_WEB_BREAKPOINT = 840;

/** Layout metrics for centered “bistro shell” on web and comfortable width on tablet/desktop web. */
export function useAppShell() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const available = Math.max(0, width - PAGE_PADDING * 2);
  const innerWidth = Math.min(MAX_CONTENT, available);
  const isWideWeb = isWeb && width >= WIDE_WEB_BREAKPOINT;
  const columnGap = 12;
  const cardWidth = isWideWeb ? (innerWidth - columnGap) / 2 : innerWidth;

  return {
    isWeb,
    isWideWeb,
    pagePadding: PAGE_PADDING,
    innerWidth,
    cardWidth,
    columnGap,
  };
}
