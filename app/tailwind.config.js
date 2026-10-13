/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surface
        bg: "#F1EEE6",
        "bg-warm": "#EDE9DE",
        surface: "#FFFFFF",
        "surface-2": "#F7F4ED",
        "surface-dim": "#E8E4D8",
        // Text
        ink: "#15140F",
        "ink-2": "#3B3A33",
        "ink-mute": "#8A857A",
        "ink-faint": "#B6B1A5",
        // Brand
        lime: "#C8F23D",
        "lime-dim": "#B5DC36",
        olive: "#19260A",
        "olive-2": "#2F3F18",
        // Macros
        protein: "#E1654A",
        carbs: "#E8B339",
        fat: "#4F8F8A",
        "protein-tint": "#FBEAE3",
        "carbs-tint": "#FBEFD5",
        "fat-tint": "#DFEDEB",
        // Status
        warn: "#D14D3C",
        "warn-tint": "#F9E5E2",
        ok: "#4A8C4A",
        // Legacy aliases
        brand: { DEFAULT: "#19260A", light: "#C8F23D", dark: "#0d1605" },
        muted: "#8A857A",
      },
    },
  },
  plugins: [],
};
