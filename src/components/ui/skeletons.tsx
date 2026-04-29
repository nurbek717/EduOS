import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatsCardsSkeletonProps = {
  count?: number;
  className?: string;
};

export const StatsCardsSkeleton = ({ count = 4, className }: StatsCardsSkeletonProps) => (
  <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export const TableSkeleton = ({ rows = 5, columns = 4 }: TableSkeletonProps) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <TableCell key={colIndex}>
            <Skeleton
              className={cn(
                "h-4",
                colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-16 ml-auto" : "w-24",
              )}
            />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

type ListSkeletonProps = {
  rows?: number;
  className?: string;
  showAvatar?: boolean;
};

export const ListSkeleton = ({ rows = 5, className, showAvatar = false }: ListSkeletonProps) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-md border bg-background p-3">
        {showAvatar && <Skeleton className="h-9 w-9 shrink-0 rounded-full" />}
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

type ChatSkeletonProps = {
  variant?: "targets" | "threads" | "messages";
  rows?: number;
  className?: string;
};

export const ChatSkeleton = ({ variant = "threads", rows = 4, className }: ChatSkeletonProps) => {
  if (variant === "messages") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: rows }).map((_, index) => {
          const isOwn = index % 2 === 1;
          return (
            <div key={index} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[70%] space-y-2 rounded-2xl p-3", isOwn ? "bg-primary/10" : "bg-muted")}>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-md border bg-background p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
};

type PageHeaderSkeletonProps = {
  className?: string;
  withDivider?: boolean;
};

export const PageHeaderSkeleton = ({ className, withDivider = true }: PageHeaderSkeletonProps) => (
  <div className={cn("space-y-3", className)}>
    <Skeleton className="h-7 w-56" />
    <Skeleton className="h-4 w-72" />
    {withDivider && <Skeleton className="h-1 w-12 rounded-full" />}
  </div>
);

type ChartSkeletonProps = {
  height?: number;
  className?: string;
};

export const ChartSkeleton = ({ height = 256, className }: ChartSkeletonProps) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16" />
    </CardHeader>
    <CardContent>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            className="w-full rounded-md"
            style={{ height: `${30 + ((index * 13) % 60)}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const FullScreenSkeleton = () => (
  <div className="flex min-h-screen w-full bg-background">
    <aside className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-muted/40 p-4 md:flex">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </aside>

    <main className="flex flex-1 flex-col">
      <header className="flex h-[71px] shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <PageHeaderSkeleton />
        <StatsCardsSkeleton count={4} />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <ListSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
);
