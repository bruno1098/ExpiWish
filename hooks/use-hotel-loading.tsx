"use client"

import { useState, useEffect } from 'react'
import { listAllHotels } from '@/lib/firestore-service'
import { getCurrentUserData } from '@/lib/auth-service'
import { devLog } from '@/lib/dev-logger'

interface UseHotelLoadingProps {
  userId?: string
  hotelName?: string
}

interface LoadingData {
  userData: any
  hotelData: any
  dashboardData: any
}

export function useHotelLoading({ userId, hotelName }: UseHotelLoadingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState<LoadingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startLoading = async () => {
    if (!userId) {
      setError('ID do usuário não fornecido')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      devLog('🔄 Iniciando carregamento de dados do hotel...')
      
      // Simular carregamento assíncrono de dados
      const promises = []
      
      // 1. Carregar dados do usuário
      promises.push(
        getCurrentUserData().then((data: any) => {
          devLog('✅ Dados do usuário carregados')
          return { type: 'userData', data }
        })
      )
      
      // 2. Carregar dados dos hotéis (se for admin)
      if (hotelName === 'admin' || !hotelName) {
        promises.push(
          listAllHotels().then((data: any) => {
            devLog('✅ Dados dos hotéis carregados')
            return { type: 'hotelData', data }
          })
        )
      }
      
      // 3. Simular carregamento de dados do dashboard
      promises.push(
        new Promise(resolve => {
          setTimeout(() => {
            devLog('✅ Dados do dashboard preparados')
            resolve({ type: 'dashboardData', data: { ready: true } })
          }, 1000)
        })
      )
      
      // Aguardar todos os dados serem carregados
      const results = await Promise.all(promises)
      
      // Organizar os dados carregados
      const organizedData: LoadingData = {
        userData: null,
        hotelData: null,
        dashboardData: null
      }
      
      results.forEach((result: any) => {
        if (result.type === 'userData') {
          organizedData.userData = result.data
        } else if (result.type === 'hotelData') {
          organizedData.hotelData = result.data
        } else if (result.type === 'dashboardData') {
          organizedData.dashboardData = result.data
        }
      })
      
      setLoadingData(organizedData)
      devLog('🎉 Todos os dados carregados com sucesso!')
      
      // Aguardar um pouco mais para garantir uma experiência suave
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (err) {
      devLog('❌ Erro ao carregar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const resetLoading = () => {
    setIsLoading(false)
    setLoadingData(null)
    setError(null)
  }

  return {
    isLoading,
    loadingData,
    error,
    startLoading,
    resetLoading
  }
}