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
    <div className={`rounded-2xl overflow-hidden mb-4 bg-card border border-border shadow-sm ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="w-4 h-4 text-primary flex items-center justify-center">{icon}</span>
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}
