import { type ReactNode } from "react"

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6 py-4">
      {icon && (
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10 shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold font-display text-foreground">{title}</h1>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
