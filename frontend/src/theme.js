import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode = "dark") {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#61e7d4" : "#0D9488" },
      secondary: { main: dark ? "#ff9b71" : "#f97352" },
      background: {
        default: dark ? "#071216" : "#f5f8f7",
        paper: dark ? "rgba(17, 31, 35, 0.78)" : "rgba(255, 255, 255, 0.9)",
      },
      text: {
        primary: dark ? "#edfdf9" : "#17313a",
        secondary: dark ? "#a6bfbb" : "#516173",
      },
    },
    typography: {
      fontFamily: "'DM Sans', sans-serif",
      h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
      h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
      h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiPaper: {
        styleOverrides: {
            root: {
              border: `1px solid ${dark ? "rgba(97, 231, 212, 0.14)" : "rgba(13, 148, 136, 0.10)"}`,
              borderRadius: 16,
              backdropFilter: "blur(18px)",
              boxShadow: dark ? "0 14px 34px rgba(0, 0, 0, 0.18)" : "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 14,
            transition: "transform 160ms ease, box-shadow 160ms ease",
            "&:active": { transform: "scale(0.97)" },
          },
          containedPrimary: {
            boxShadow: dark ? "0 0 24px rgba(97, 231, 212, 0.22)" : "0 8px 22px rgba(8, 127, 115, 0.18)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: "box-shadow 160ms ease, border-color 160ms ease",
            "&.Mui-focused": { boxShadow: `0 0 0 3px ${dark ? "rgba(97, 231, 212, 0.18)" : "rgba(13, 148, 136, 0.14)"}` },
          },
        },
      },
    },
  });
}

export const getInitialThemeMode = () => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("easybill_theme_mode");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
