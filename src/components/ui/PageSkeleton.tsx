import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="flex h-full flex-col p-6 gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function SidebarTeamsSkeleton() {
  return (
    <div className="ml-9 mt-2 space-y-1.5 border-l border-border">
      <div className="mb-2 pl-3">
        <Skeleton className="h-3 w-20" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="pl-3 py-1">
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex flex-col border-b border-border/50 bg-background pt-2 px-6 pb-4 gap-3">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="flex gap-2 pt-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Board columns skeleton */}
      <div className="flex gap-4 p-6 flex-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
