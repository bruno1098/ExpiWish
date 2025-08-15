"use client"

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface HotelLoadingScreenProps {
  hotelName: string
  isVisible: boolean
  onLoadingComplete: () => void
}

// Função para obter a logo do hotel baseado no nome
const getHotelLogo = (hotelName: string) => {
  if (!hotelName) return null
  
  // Normaliza o nome do hotel para comparação
  const normalizedName = hotelName.trim()
  
  const logoMap: { [key: string]: string } = {
    "Wish Foz do Iguaçu": "/logo-novo-horizontal-wish-foz-do-iguacu.png",
    "Wish Natal": "/logo-novo-horizontal-wish-natal.png",
    "Wish Serrano": "/logo-novo-horizontal-wish-serrano.png",
    "Marupiara by Wish": "/marupiara-by-wish-azul.png",
    "Prodigy Gramado by Wish": "/prodigy-gramado-by-wish-vermelho.png",
    "Prodigy SDU by Wish": "/prodigy-sdu-by-wish-vermelho.png",
    // Variações alternativas para Prodigy SDU
     "Prodigy SDU": "/prodigy-sdu-by-wish-vermelho.png",
     "prodigy sdu by wish": "/prodigy-sdu-by-wish-vermelho.png",
     "PRODIGY SDU BY WISH": "/prodigy-sdu-by-wish-vermelho.png",
     "Prodigy Santos Dumont": "/prodigy-sdu-by-wish-vermelho.png",
     "prodigy santos dumont": "/prodigy-sdu-by-wish-vermelho.png",
     "PRODIGY SANTOS DUMONT": "/prodigy-sdu-by-wish-vermelho.png",
    "Confins": "/Confins.png",
    "Galeão": "/Galeão.png",
    "Bahia": "/Logo Bahia.png"
  }
  
  // Busca exata primeiro
  if (logoMap[normalizedName]) {
    return logoMap[normalizedName]
  }
  
  // Busca case-insensitive como fallback
  const lowerName = normalizedName.toLowerCase()
  for (const [key, value] of Object.entries(logoMap)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }
  
  // Busca parcial para casos como "Prodigy Gramado" sem "by Wish"
  for (const [key, value] of Object.entries(logoMap)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return value
    }
  }
  
  return null
}

// Função para obter a logo do admin
const getAdminLogo = () => "/adminLogo.png"

export default function HotelLoadingScreen({ 
  hotelName, 
  isVisible, 
  onLoadingComplete 
}: HotelLoadingScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Carregando...')
  
  // Determinar se é admin e qual logo usar
  const isAdmin = hotelName === 'Todos os Hotéis - Grupo Wish' 
  const logoSrc = isAdmin ? getAdminLogo() : getHotelLogo(hotelName)
  
  // Textos de carregamento dinâmicos
  const loadingTexts = isAdmin 
    ? [
        'Inicializando painel administrativo...',
        'Carregando dados dos hotéis...',
        'Preparando dashboard...',
        'Quase pronto!'
      ]
    : [
        `Bem-vindo ao ${hotelName}!`,
        'Carregando seus dados...',
        'Preparando dashboard...',
        'Quase pronto!'
      ]

  useEffect(() => {
    if (!isVisible) return

    let progressInterval: NodeJS.Timeout
    let textInterval: NodeJS.Timeout
    let currentTextIndex = 0

    // Simular carregamento progressivo com timing controlado
    progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const increment = Math.random() * 8 + 4 // 4-12% por vez
        const newProgress = Math.min(prev + increment, 100)
        
        if (newProgress >= 100) {
          clearInterval(progressInterval)
          // Aguardar 1 segundo para mostrar 100% antes de finalizar
          setTimeout(() => {
            onLoadingComplete()
          }, 1000)
        }
        
        return newProgress
      })
    }, 400) // A cada 400ms

    // Alterar texto de carregamento
    textInterval = setInterval(() => {
      currentTextIndex = (currentTextIndex + 1) % loadingTexts.length
      setLoadingText(loadingTexts[currentTextIndex])
    }, 1500) // Texto muda a cada 1.5 segundos

    return () => {
      clearInterval(progressInterval)
      clearInterval(textInterval)
    }
  }, [isVisible, onLoadingComplete, loadingTexts])

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-full h-full z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
        {/* Efeito de partículas de fundo simplificado */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/10 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Container principal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center space-y-8 p-8"
        >
          {/* Logo do hotel */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="relative"
          >
            {logoSrc ? (
              <div className="relative w-64 h-32 flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt={isAdmin ? "Logo Admin" : `Logo ${hotelName}`}
                  width={256}
                  height={128}
                  className="object-contain max-w-full max-h-full filter drop-shadow-lg"
                  priority
                />
              </div>
            ) : (
              <div className="w-64 h-32 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-2xl">
                <span className="text-white text-2xl font-bold">
                  {hotelName || 'ExpiWish'}
                </span>
              </div>
            )}
            

          </motion.div>

          {/* Texto de carregamento */}
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              {loadingText}
            </h2>
            
            {/* Barra de progresso */}
            <div className="w-80 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            {/* Porcentagem */}
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {Math.round(loadingProgress)}%
            </p>
          </div>

          {/* Spinner animado */}
          <div className="relative">
            <div className="w-8 h-8 border-2 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        </motion.div>
    </motion.div>
  )
}