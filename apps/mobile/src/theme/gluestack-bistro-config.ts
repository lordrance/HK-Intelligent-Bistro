import { config as gluestackConfig } from "@gluestack-ui/config";

/**
 * Bistro accent: maps Gluestack semantic `primary*` to gold so `action="primary"` reads on-brand.
 */
const bistroPrimaryScale = {
  primary0: "#fffdf8",
  primary50: "#fdf8ef",
  primary100: "#f5ecd4",
  primary200: "#ead9b8",
  primary300: "#e0c89c",
  primary400: "#d4af65",
  primary500: "#c49d4e",
  primary600: "#a8843f",
  primary700: "#8c6d34",
  primary800: "#6e5528",
  primary900: "#4f3d1d",
  primary950: "#2a2110",
};

export const bistroConfig = {
  ...gluestackConfig,
  tokens: {
    ...gluestackConfig.tokens,
    colors: {
      ...gluestackConfig.tokens.colors,
      ...bistroPrimaryScale,
    },
  },
};
