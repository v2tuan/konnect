import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonConversation() {
  return (
    <>
      <div className="space-y-1 p-2">
        <div
          className={`p-3 rounded-lg cursor-pointer transition-all duration-fast hover:bg-card-hover`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-[150px]" />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  <Skeleton className="h-4 w-[200px]" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
