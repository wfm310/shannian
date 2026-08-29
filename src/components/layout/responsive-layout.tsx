'use client'

import { useIsDesktop } from "@/hooks/use-media-query"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Topbar } from "@/components/layout/topbar"
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar"
import { PageTransition } from "@/components/page-transition"

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop()

  if (!isDesktop) {
    return (
      <div className="flex flex-col mobile-vh">
        <main className="flex-1 overflow-y-auto touch-scroll min-w-0 pb-safe-5">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileTabBar />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="sticky top-0 z-50">
          <Topbar />
        </div>
        <main
          className="overflow-y-auto overflow-x-hidden min-w-0"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
