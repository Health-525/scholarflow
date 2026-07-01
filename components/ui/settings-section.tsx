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
    <div className={`rounded-xl border border-border bg-card mb-4 hover:shadow-sm transition-shadow duration-200 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="size-4 text-[#8F959E] flex items-center justify-center">{icon}</span>
        <span className="text-xs font-semibold text-[#8F959E] uppercase tracking-wider pl-3 border-l-2 border-primary">{title}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  )
}
