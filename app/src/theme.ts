export const colors = {
  bg: "#F3EEE3",
  card: "#FBF8F1",
  ink: "#151515",
  muted: "#6E685C",
  faint: "rgba(21,21,21,0.06)",
  border: "rgba(21,21,21,0.10)",
  accent: "#D6261D",
  accentSoft: "#F8E0DC",
  onAccent: "#FBF8F1",
  success: "#2F9E5B",
  danger: "#B42318",
};

export const radius = { card: 20, inner: 14, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const font = {
  heavy: "900" as const,
  bold: "800" as const,
  semi: "600" as const,
};

export const shadow = {
  card: "0 1px 2px rgba(60,40,20,0.06), 0 12px 28px -8px rgba(60,40,20,0.14)",
  raised: "0 1px 2px rgba(60,40,20,0.10), 0 3px 8px rgba(60,40,20,0.08)",
  accent:
    "0 1px 2px rgba(214,38,29,0.30), 0 8px 18px -6px rgba(214,38,29,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
  toast: "0 2px 6px rgba(0,0,0,0.12), 0 18px 36px -10px rgba(0,0,0,0.35)",
};
