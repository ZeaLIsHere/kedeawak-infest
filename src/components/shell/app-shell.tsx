import { Store } from "lucide-react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/shell/bottom-nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";

export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="flex h-header shrink-0 items-center gap-2 border-b border-sidebar-border px-gutter">
          <Store aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <span className="text-section-title font-semibold">KedeAwak</span>
        </div>

        <SidebarNav />
      </aside>

      {/* pb-bottom-nav memberi ruang bagi batang bawah yang menempel di layar */}
      <main className="min-w-0 flex-1 pb-bottom-nav lg:pb-0">{children}</main>

      <BottomNav />
    </div>
  );
}
