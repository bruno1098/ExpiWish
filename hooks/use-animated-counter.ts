import { useEffect, useState, useRef } from 'react'

interface UseAnimatedCounterOptions {
  duration?: number // Duração da animação em ms
  delay?: number // Delay antes de iniciar a animação
  easing?: (t: number) => number // Função de easing personalizada
}

/**
 * Hook personalizado para animar contagem de números
 * Cria um efeito suave de contagem progressiva do valor anterior para o novo valor
 * 
 * @param targetValue - Valor final que queremos alcançar
 * @param options - Opções de configuração da animação
 * @returns Valor atual da animação
 */
export function useAnimatedCounter(
  targetValue: number, 
  options: UseAnimatedCounterOptions = {}
): number {
  const {
    duration = 400, // 400ms por padrão - mais rápido
    delay = 0,
    easing = (t: number) => {
      // Easing mais dinâmico com bounce no final
      if (t < 0.5) {
        return 4 * t * t * t // Aceleração inicial
      } else {
        return 1 - Math.pow(-2 * t + 2, 3) / 2 // Desaceleração com bounce
      }
    }
  } = options

  const [currentValue, setCurrentValue] = useState(0)
  const [isFirstRender, setIsFirstRender] = useState(true)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef<number>(0)

  useEffect(() => {
    // Se é o primeiro render, define o valor inicial como 0 para animar desde o início
    if (isFirstRender) {
      setIsFirstRender(false)
      startValueRef.current = 0
    } else {
      // Para mudanças subsequentes, usa o valor atual como ponto de partida
      startValueRef.current = currentValue
    }

    // Cancela animação anterior se existir
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Função de animação
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp + delay
      }

      const elapsed = timestamp - startTimeRef.current
      
      if (elapsed < 0) {
        // Ainda no período de delay
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      
      const startValue = startValueRef.current
      const difference = targetValue - startValue
      const newValue = startValue + (difference * easedProgress)
      
      setCurrentValue(newValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Garante que o valor final seja exato
        setCurrentValue(targetValue)
        startTimeRef.current = undefined
      }
    }

    // Inicia a animação
    startTimeRef.current = undefined
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValue, duration, delay, easing])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return Math.round(currentValue)
}

/**
 * Hook para animar valores decimais (como médias)
 * Similar ao useAnimatedCounter mas mantém casas decimais
 */
export function useAnimatedDecimal(
  targetValue: number, 
  decimalPlaces: number = 1,
  options: UseAnimatedCounterOptions = {}
): string {
  const animatedValue = useAnimatedCounter(targetValue * Math.pow(10, decimalPlaces), options)
  return (animatedValue / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces)
}