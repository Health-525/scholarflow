export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="notes-flybook h-full"
      style={{
        // ── shadcn/ui tokens (scoped to /notes) ──
        "--primary": "#3370FF",
        "--primary-foreground": "#FFFFFF",
        "--primary-rgb": "51, 112, 255",
        "--background": "#FFFFFF",
        "--foreground": "#1F2329",
        "--card": "#FFFFFF",
        "--card-foreground": "#1F2329",
        "--muted": "#F5F6F7",
        "--muted-foreground": "#646A73",
        "--border": "#E5E6EB",
        "--input": "#E5E6EB",
        "--ring": "#3370FF",
        "--radius": "0.5rem",
        "--secondary": "#F5F6F7",
        "--secondary-foreground": "#1F2329",
        "--destructive": "#F54A45",
        "--destructive-foreground": "#FFFFFF",
        "--accent": "#3370FF",
        "--accent-foreground": "#FFFFFF",
        "--accent-soft": "rgba(51, 112, 255, 0.1)",
        "--accent-softer": "rgba(51, 112, 255, 0.06)",
        // ── sidebar overrides ──
        "--sidebar": "#F5F6F7",
        "--sidebar-foreground": "#1F2329",
        "--sidebar-primary": "#3370FF",
        "--sidebar-primary-foreground": "#FFFFFF",
        "--sidebar-accent": "#F0F5FF",
        "--sidebar-accent-foreground": "#1F2329",
        "--sidebar-border": "#E5E6EB",
        "--sidebar-ring": "#3370FF",
        // ── notes-specific ──
        "--notes-active-bg": "#E8F0FE",
        "--notes-active-text": "#3370FF",
        "--notes-hover-bg": "var(--sidebar-accent)",
        "--notes-tertiary": "#8F959E",
        "--notes-placeholder": "#C9CDD4",
        "--notes-pin": "#F5A623",
        "--notes-primary-hover": "#2860DF",
        // ── shadows ──
        "--shadow-xs": "0 1px 2px rgba(0,0,0,0.04)",
        "--shadow-sm": "0 2px 8px rgba(0,0,0,0.06)",
        "--shadow-md": "0 4px 12px rgba(0,0,0,0.08)",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
