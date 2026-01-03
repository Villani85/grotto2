"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingSkeletonBacheca() {
  return (
    <div className="space-y-4">
      {/* Composer Skeleton */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Skeletons */}
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card
          key={idx}
          className="border-l-4 border-l-blue-500 border shadow-sm"
        >
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 pb-3 border-b">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            {/* Body */}
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {/* Footer */}
            <div className="px-4 pb-4 pt-2 border-t">
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <div className="ml-auto">
                  <Skeleton className="h-5 w-8" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
