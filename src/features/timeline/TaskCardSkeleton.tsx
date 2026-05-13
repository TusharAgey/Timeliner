import { Skeleton } from "../../components/ui/Skeleton";

export const TaskCardSkeleton = () => (
  <div className="rounded-[20px] bg-white/[0.035] p-3 ring-1 ring-white/6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={8} height={8} />
        <Skeleton variant="text" width={64} height={20} />
      </div>
      <Skeleton variant="text" width={96} height={16} />
    </div>
    <Skeleton variant="text" width="60%" height={20} className="mt-3" />
    <div className="mt-3 flex items-center gap-2">
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width={80} height={16} />
      <Skeleton variant="text" width={12} height={16} />
      <Skeleton variant="text" width={60} height={16} />
    </div>
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <Skeleton variant="text" width={48} height={12} />
        <Skeleton variant="text" width={64} height={12} />
      </div>
      <Skeleton variant="rectangular" width="100%" height={6} />
    </div>
    <div className="mt-3 flex items-center gap-2">
      <Skeleton variant="text" width={72} height={28} />
      <Skeleton variant="text" width={64} height={28} />
    </div>
  </div>
);
