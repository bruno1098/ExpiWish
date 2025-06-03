"use client"

import { MessageSquare } from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme-preference"
    >
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        {children}
      </div>
      <Toaster />
    </ThemeProvider>
  )
} 