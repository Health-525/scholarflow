import { type ReactNode } from "react"

interface SettingsSectionProps {
  icon: ReactNode
  title: string
  badge?: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsSection({ icon, title, badge, children, className = "" }: SettingsSectionProps) {
  return (
    <div className={`rounded-xl border border-border bg-card mb-4 ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="size-4 text-muted-foreground flex items-center justify-center">{icon}</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}
