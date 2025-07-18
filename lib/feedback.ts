import { type Feedback } from "@/types"
import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';

interface StatsData {
  totalFeedbacks: number
  averageRating: number
  positiveSentiment: number
  responseRate: number
  ratingDistribution: Array<{
    rating: number
    count: number
  }>
  recentFeedbacks: Feedback[]
  sectorDistribution: Array<{
    sector: string
    count: number
  }>
  keywordDistribution: Array<{
    keyword: string
    count: number
  }>
  sentimentTrend: Array<{
    date: string
    positive: number
    negative: number
    neutral: number
  }>
  hotelDistribution: Array<{
    hotel: string
    count: number
  }>
  sourceDistribution: Array<{
    source: string
    count: number
  }>
  languageDistribution: Array<{
    language: string
    count: number
  }>
}

let feedbacks: Feedback[] = []

export { type Feedback, type StatsData }

export function getFeedbacks() {
  return feedbacks
}

export function addFeedback(feedback: Feedback) {
  feedbacks.push(feedback)
}

export function storeFeedbacks(newFeedbacks: Feedback[]) {
  feedbacks = [...newFeedbacks]
}

export async function getFeedbackStats(): Promise<StatsData> {
  const totalFeedbacks = feedbacks.length
  const averageRating = feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / totalFeedbacks || 0
  const positiveSentiment = (feedbacks.filter(f => f.sentiment === "positive").length / totalFeedbacks) * 100 || 0
  const responseRate = 100 

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: feedbacks.filter(f => f.rating === rating).length
  }))

  // Distribuição por setor
  const sectorCounts = feedbacks.reduce((acc, curr) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sectorDistribution = Object.entries(sectorCounts).map(([sector, count]) => ({
    sector,
    count
  }));

  // Distribuição por palavra-chave
  const keywordCounts = feedbacks.reduce((acc, curr) => {
    acc[curr.keyword] = (acc[curr.keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const keywordDistribution = Object.entries(keywordCounts)
    .map(([keyword, count]) => ({
      keyword,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Tendência de sentimento ao longo do tempo
  const sentimentByDate = feedbacks.reduce((acc, curr) => {
    const date = new Date(curr.date).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { date, positive: 0, negative: 0, neutral: 0 }
    }
    acc[date][curr.sentiment]++
    return acc
  }, {} as Record<string, any>)

  const sentimentTrend = Object.values(sentimentByDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Feedbacks recentes (últimos 5)
  const recentFeedbacks = [...feedbacks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Distribuição por Hotel
  const hotelDistribution = Object.entries(
    feedbacks.reduce((acc, feedback) => {
      acc[feedback.hotel] = (acc[feedback.hotel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([hotel, count]) => ({ hotel, count }));

  // Distribuição por Fonte
  const sourceDistribution = Object.entries(
    feedbacks.reduce((acc, feedback) => {
      acc[feedback.source] = (acc[feedback.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([source, count]) => ({ source, count }));

  // Distribuição por Idioma
  const languageDistribution = Object.entries(
    feedbacks.reduce((acc, feedback) => {
      acc[feedback.language] = (acc[feedback.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([language, count]) => ({ language, count }));

  return {
    totalFeedbacks,
    averageRating,
    positiveSentiment,
    responseRate,
    ratingDistribution,
    recentFeedbacks,
    sectorDistribution,
    keywordDistribution,
    sentimentTrend,
    hotelDistribution,
    sourceDistribution,
    languageDistribution,
  }
}

// Função para analisar o sentimento do texto
export function analyzeSentiment(text: string): string {
  // Palavras-chave positivas e negativas em português
  const positiveWords = ['bom', 'ótimo', 'excelente', 'adorei', 'gostei', 'maravilhoso', 'perfeito', 'satisfeito']
  const negativeWords = ['ruim', 'péssimo', 'horrível', 'detestei', 'não gostei', 'insatisfeito', 'problema', 'terrível']

  text = text.toLowerCase()
  
  let positiveCount = positiveWords.filter(word => text.includes(word)).length
  let negativeCount = negativeWords.filter(word => text.includes(word)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

// Interface para o resultado da análise do Firestore
export interface FirestoreAnalysisResult {
  id: string;
  hotelName: string;
  importDate: any; // Timestamp do Firestore
  data: Feedback[];
  analysis: any;
}

// Função para obter os dados mais recentes do Firestore
export const getLatestAnalysisFromFirestore = async (): Promise<FirestoreAnalysisResult | null> => {
  try {
    const q = query(
      collection(db, 'analyses'), 
      orderBy('importDate', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as FirestoreAnalysisResult;
  } catch (error) {
    console.error('Erro ao obter análise mais recente do Firestore:', error);
    return null;
  }
};

// Função para obter todos os dados do Firestore para o dashboard
export const getAllAnalysisDataForDashboard = async () => {
  try {
    
    const q = query(collection(db, 'analyses'), orderBy('importDate', 'desc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      
      return null;
    }

    // Array para armazenar todos os dados de feedback
    let allFeedbacks: Feedback[] = [];
    
    // Extrair dados de cada documento
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.data && Array.isArray(data.data)) {
        
        allFeedbacks = [...allFeedbacks, ...data.data];
      }
    });

    // Processar os dados agregados
    const aggregatedStats = processAggregatedData(allFeedbacks);
    
    return aggregatedStats;
  } catch (error) {
    console.error('Erro ao obter dados agregados do Firestore:', error);
    return null;
  }
};

// Função para processar os dados agregados
const processAggregatedData = (allFeedbacks: Feedback[]) => {
  if (!allFeedbacks.length) return null;
  
  // Calcular estatísticas agregadas
  const totalFeedbacks = allFeedbacks.length;
  const averageRating = allFeedbacks.reduce((acc, item) => acc + (item.rating || 0), 0) / totalFeedbacks;
  const positiveSentiment = Math.round((allFeedbacks.filter(item => item.sentiment === 'positive').length / totalFeedbacks) * 100);
  
  // Processar distribuições com tipagem correta
  const hotelDistribution = processDistribution(allFeedbacks, 'hotel') as Array<{ hotel: string; count: number }>;
  const sourceDistribution = processDistribution(allFeedbacks, 'source') as Array<{ source: string; count: number }>;
  const languageDistribution = processDistribution(allFeedbacks, 'language') as Array<{ language: string; count: number }>;
  const sectorDistribution = processDistribution(allFeedbacks, 'sector') as Array<{ sector: string; count: number }>;
  
  // Processar distribuição por avaliação
  const ratingDistribution = processRatingDistribution(allFeedbacks);
  
  // Processar distribuição por palavra-chave
  const keywordDistribution = processKeywordDistribution(allFeedbacks);
  
  // Processar tendência de sentimento
  const sentimentTrend = processSentimentTrend(allFeedbacks);
  
  // Obter feedbacks recentes
  const recentFeedbacks = [...allFeedbacks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  // Retornar objeto que corresponde exatamente ao tipo StatsData
  return {
    totalFeedbacks,
    averageRating,
    positiveSentiment,
    responseRate: 0,
    hotelDistribution,
    sourceDistribution,
    languageDistribution,
    ratingDistribution,
    sectorDistribution,
    keywordDistribution,
    sentimentTrend,
    recentFeedbacks
  };
};

// Função auxiliar para processar distribuições genéricas
const processDistribution = (data: Feedback[], field: keyof Feedback) => {
  const distribution: Record<string, number> = {};
  
  data.forEach(item => {
    const value = String(item[field] || 'Não especificado');
    distribution[value] = (distribution[value] || 0) + 1;
  });
  
  // Converter para o formato de array esperado pelos gráficos
  // Corrigindo para retornar o formato exato esperado pelo tipo StatsData
  if (field === 'hotel') {
    return Object.entries(distribution).map(([hotel, count]) => ({
      hotel,
      count
    }));
  } else if (field === 'source') {
    return Object.entries(distribution).map(([source, count]) => ({
      source,
      count
    }));
  } else if (field === 'language') {
    return Object.entries(distribution).map(([language, count]) => ({
      language,
      count
    }));
  } else if (field === 'sector') {
    return Object.entries(distribution).map(([sector, count]) => ({
      sector,
      count
    }));
  } else {
    // Para outros campos, retornar um formato genérico
    return Object.entries(distribution).map(([key, count]) => ({
      [field]: key,
      count
    }));
  }
};

// Função específica para processar distribuição de avaliações
const processRatingDistribution = (data: Feedback[]) => {
  const ratings: Record<number, number> = {};
  
  data.forEach(item => {
    const rating = item.rating || 0;
    ratings[rating] = (ratings[rating] || 0) + 1;
  });
  
  return Object.entries(ratings).map(([rating, count]) => ({
    rating: Number(rating),
    count
  }));
};

// Função específica para processar distribuição de palavras-chave
const processKeywordDistribution = (data: Feedback[]) => {
  const keywords: Record<string, number> = {};
  
  data.forEach(item => {
    const keyword = item.keyword || 'Não especificado';
    keywords[keyword] = (keywords[keyword] || 0) + 1;
  });
  
  return Object.entries(keywords)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 keywords
};

// Função para processar tendência de sentimento
const processSentimentTrend = (data: Feedback[]) => {
  // Definir um tipo para os sentimentos válidos
  type SentimentType = 'positive' | 'negative' | 'neutral';
  
  // Agrupar por mês
  const sentimentByMonth: Record<string, Record<SentimentType, number>> = {};
  
  data.forEach(item => {
    const date = new Date(item.date);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
    
    if (!sentimentByMonth[monthYear]) {
      sentimentByMonth[monthYear] = { positive: 0, negative: 0, neutral: 0 };
    }
    
    // Garantir que sentiment seja um dos valores válidos
    const sentiment = (item.sentiment === 'positive' || item.sentiment === 'negative' || 
                       item.sentiment === 'neutral') ? 
                       item.sentiment as SentimentType : 'neutral';
    
    // Agora o TypeScript sabe que sentiment é uma chave válida
    sentimentByMonth[monthYear][sentiment]++;
  });
  
  // Converter para o formato esperado pelo gráfico
  return Object.entries(sentimentByMonth)
    .map(([date, counts]) => ({
      date,
      ...counts
    }))
    .sort((a, b) => {
      const [aMonth, aYear] = a.date.split('/').map(Number);
      const [bMonth, bYear] = b.date.split('/').map(Number);
      
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });
};