'use client'

interface LoadingSkeletonProps {
  className?: string
  width?: string
  height?: string
}

export default function LoadingSkeleton({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4' 
}: LoadingSkeletonProps) {
  return (
    <div 
      className={`animate-pulse rounded-lg ${width} ${height} ${className}`}
      style={{ backgroundColor: 'var(--color-gunmetal)' }}
    />
  )
}

// Card skeleton for player cards
export function CardSkeleton() {
  return (
    <div 
      className="rounded-xl p-4 border-2"
      style={{
        backgroundColor: 'var(--color-midnight)',
        borderColor: 'var(--color-steel)'
      }}
    >
      <div className="animate-pulse space-y-3">
        <LoadingSkeleton height="h-6" width="w-3/4" />
        <LoadingSkeleton height="h-4" width="w-1/2" />
        <div className="space-y-2">
          <LoadingSkeleton height="h-3" />
          <LoadingSkeleton height="h-3" />
          <LoadingSkeleton height="h-3" width="w-2/3" />
        </div>
        <LoadingSkeleton height="h-8" className="rounded-lg" />
      </div>
    </div>
  )
}

// Pack skeleton
export function PackSkeleton() {
  return (
    <div 
      className="rounded-xl p-6 border-2"
      style={{
        backgroundColor: 'var(--color-midnight)',
        borderColor: 'var(--color-steel)'
      }}
    >
      <div className="animate-pulse space-y-4 text-center">
        <LoadingSkeleton height="h-12" width="w-12" className="mx-auto rounded-full" />
        <LoadingSkeleton height="h-6" width="w-3/4" className="mx-auto" />
        <LoadingSkeleton height="h-4" width="w-1/2" className="mx-auto" />
        <LoadingSkeleton height="h-8" width="w-24" className="mx-auto" />
        <LoadingSkeleton height="h-10" className="rounded-lg" />
      </div>
    </div>
  )
}

// Lineup slot skeleton
export function LineupSlotSkeleton() {
  return (
    <div 
      className="rounded-lg border-2 border-dashed p-4"
      style={{
        backgroundColor: 'var(--color-midnight)',
        borderColor: 'var(--color-steel)',
        minHeight: '100px'
      }}
    >
      <div className="animate-pulse space-y-2">
        <LoadingSkeleton height="h-3" width="w-8" />
        <LoadingSkeleton height="h-3" width="w-20" />
        <LoadingSkeleton height="h-4" width="w-16" />
        <LoadingSkeleton height="h-3" width="w-12" />
      </div>
    </div>
  )
}
