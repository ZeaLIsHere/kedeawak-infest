import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StateBlockProps = {
  readonly icon: LucideIcon;
  readonly title: string;
  /** Satu kalimat yang menerangkan keadaan, bukan mengulang judulnya. */
  readonly description: string;
  /** Satu tindakan lanjutan, hanya bila memang ada tujuan yang dapat dibuka. */
  readonly action?: ReactNode;
};

/**
 * Keadaan kosong atau gagal di dalam sebuah kartu bagian.
 *
 * Berbeda dari `EmptyState` yang berdiri sendiri sebagai satu bagian penuh di
 * halaman, blok ini tidak menggambar permukaan sendiri karena sudah berada di
 * dalam `SectionCard`. Isinya mengikuti DESIGN.md bagian 7: judul singkat, satu
 * kalimat penjelasan, dan satu tindakan lanjutan bila ada.
 */
export function StateBlock({ icon: Icon, title, description, action }: StateBlockProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
      <p className="text-section-title font-semibold">{title}</p>
      <p className="max-w-md text-body text-muted-foreground">{description}</p>
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}
