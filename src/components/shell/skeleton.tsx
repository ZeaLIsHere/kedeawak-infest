import { cn } from "@/lib/utils";

type SkeletonProps = {
  readonly className?: string;
};

/**
 * Kerangka muat: abu dengan bentuk menyerupai isi aslinya, sesuai DESIGN.md
 * bagian 7. Ditandai `aria-hidden` karena hanya hiasan, sedangkan keadaan
 * memuat disampaikan lewat teks pendamping pada kartunya.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}
