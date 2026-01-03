import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-skeleton rounded-md bg-gray-800", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4",
        className
      )}
      {...props}
    >
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Welcome Section Skeleton */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Quick Actions Skeleton */}
      <div>
        <Skeleton className="h-7 w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4"
            >
              <Skeleton className="h-14 w-14 rounded-lg" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, DashboardSkeleton }
