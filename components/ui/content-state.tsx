import { type ReactNode } from "react"
import { ErrorFallback } from "./ErrorFallback"

interface ContentStateProps {
  isLoading: boolean
  error: Error | null
  data: unknown
  loadingSkeleton?: ReactNode
  errorFallback?: ReactNode
  emptyState?: ReactNode
  children: ReactNode
}

export function ContentState({
  isLoading,
  error,
  data,
  loadingSkeleton,
  errorFallback,
  emptyState,
  children,
}: ContentStateProps) {
  if (isLoading && loadingSkeleton) return <>{loadingSkeleton}</>
  if (error && errorFallback) return <>{errorFallback}</>
  if (error) return <ErrorFallback message={error.message} />
  if (!data && emptyState) return <>{emptyState}</>
  return <>{children}</>
}
