"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        disabled
        className="relative w-11 h-11 rounded-full bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 opacity-50"
      >
        <Sun className="h-5 w-5 text-gray-700 dark:text-gray-200" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-11 h-11 rounded-full bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 hover:bg-white/30 dark:hover:bg-gray-700/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 overflow-hidden"
    >
      <Sun className="h-5 w-5 text-gray-700 dark:text-gray-200 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 text-gray-700 dark:text-gray-200 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      <span className="sr-only">Alternar tema</span>
    </Button>
  )
}