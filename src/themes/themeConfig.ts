export type ThemeId =
  | "midnight"
  | "material-dark"
  | "material-light"
  | "apple-light"
  | "apple-space-gray"
  | "nord";

export type ThemeConfig = {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  accent: string;
  bg: string;
  icon: string;
};

export const themes: ThemeConfig[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep dark with purple accent",
    isDark: true,
    accent: "#8b5cf6",
    bg: "#08111f",
    icon: "🌙",
  },
  {
    id: "material-dark",
    name: "Material Dark",
    description: "Google Material You dark mode",
    isDark: true,
    accent: "#8ab4f8",
    bg: "#1a1c1e",
    icon: "🎨",
  },
  {
    id: "material-light",
    name: "Material Light",
    description: "Google Calendar clean light",
    isDark: false,
    accent: "#1a73e8",
    bg: "#ffffff",
    icon: "☀️",
  },
  {
    id: "apple-light",
    name: "Apple Light",
    description: "macOS/iOS light mode",
    isDark: false,
    accent: "#007aff",
    bg: "#f5f5f7",
    icon: "🍎",
  },
  {
    id: "apple-space-gray",
    name: "Space Gray",
    description: "Apple dark mode",
    isDark: true,
    accent: "#0a84ff",
    bg: "#1c1c1e",
    icon: "⚙️",
  },
  {
    id: "nord",
    name: "Nord",
    description: "Cool arctic dark theme",
    isDark: true,
    accent: "#88c0d0",
    bg: "#2e3440",
    icon: "❄️",
  },
];

export const DEFAULT_THEME: ThemeId = "midnight";

export const getTheme = (id: ThemeId): ThemeConfig =>
  themes.find((t) => t.id === id) ?? themes[0];
