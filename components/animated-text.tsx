import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface AnimatedTextProps {
  text: string
  className?: string
}

export function AnimatedText({ text, className }: AnimatedTextProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex">
      {text.split("").map((letter, index) => (
        <span
          key={index}
          className={cn(
            "transition-all duration-300 animate-gradient bg-gradient-to-r bg-clip-text text-transparent",
            mounted ? "opacity-100" : "opacity-0",
            index === 0 && "from-blue-500 via-purple-500 to-pink-500",
            index === 1 && "from-purple-500 via-pink-500 to-blue-500",
            index === 2 && "from-pink-500 via-blue-500 to-purple-500",
            index === 3 && "from-blue-500 via-purple-500 to-pink-500",
            className
          )}
          style={{
            transitionDelay: `${index * 100}ms`,
            backgroundSize: '200% auto',
            animation: 'gradient 3s linear infinite'
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  )
} 