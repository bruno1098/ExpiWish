import { useState, useEffect, useRef } from 'react'

interface SlideUpCounterOptions {
  duration?: number
  delay?: number
  easing?: (t: number) => number
}

const defaultEasing = (t: number): number => {
  // Easing mais dinâmico com bounce no final
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useSlideUpCounter(
  target: number,
  options: SlideUpCounterOptions = {}
) {
  const { duration = 1500, delay = 200, easing = defaultEasing } = options
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(0)

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const startAnimation = () => {
      setIsAnimating(true)
      startTimeRef.current = performance.now()
      startValueRef.current = displayValue

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return

        const elapsed = currentTime - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easing(progress)
        
        const currentValue = startValueRef.current + (target - startValueRef.current) * easedProgress
        setDisplayValue(Math.round(currentValue))

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    if (delay > 0) {
      const timeoutId = setTimeout(startAnimation, delay)
      return () => clearTimeout(timeoutId)
    } else {
      startAnimation()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [target, duration, delay, easing])

  return { value: displayValue, isAnimating }
}

export function useSlideUpDecimal(
  target: number,
  decimals: number = 1,
  options: SlideUpCounterOptions = {}
) {
  const { duration = 1500, delay = 300, easing = defaultEasing } = options
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(0)

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const startAnimation = () => {
      setIsAnimating(true)
      startTimeRef.current = performance.now()
      startValueRef.current = displayValue

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return

        const elapsed = currentTime - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easing(progress)
        
        const currentValue = startValueRef.current + (target - startValueRef.current) * easedProgress
        setDisplayValue(currentValue)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    if (delay > 0) {
      const timeoutId = setTimeout(startAnimation, delay)
      return () => clearTimeout(timeoutId)
    } else {
      startAnimation()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [target, duration, delay, easing, decimals])

  return { 
    value: displayValue.toFixed(decimals), 
    isAnimating 
  }
}