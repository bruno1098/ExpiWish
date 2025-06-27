"use client"

import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { RequireAuth } from "@/lib/auth-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:w-[var(--sidebar-width)] md:flex-col md:fixed md:inset-y-0 z-[80] transition-all duration-500 ease-out">
          <Sidebar />
        </div>
        <main className="md:ml-[var(--sidebar-width)] transition-all duration-500 ease-out">
          <Header />
          <div className="transition-all duration-500 ease-out">
            {children}
          </div>
        </main>
      </div>
    </RequireAuth>
  )
} 