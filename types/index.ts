export interface AnalysisResult {
  rating: number;
  keyword: string;
  sector: string;
  problem: string;
  problem_detail?: string; // detalhe textual curto do problema
  allProblems?: ProblemAnalysis[];
  // Flags de sugestão (análise automática)
  has_suggestion?: boolean; // há alguma sugestão no comentário

  suggestion_type?: 'only' | 'mixed' | 'none' | 'only_suggestion' | 'with_criticism' | 'with_praise'; // apenas sugestão | mistura | nenhuma

  suggestion_summary?: string; // resumo curto da sugestão, quando aplicável
}

export interface ProblemAnalysis {
  id?: string;
  keyword: string;
  sector: string;
  problem: string;
  problem_detail?: string; // detalhe textual opcional
}

export type Feedback = {
  id: string
  date: string
  comment: string
  rating: number
  sentiment: string
  keyword: string
  sector: string
  problem: string
  problem_detail?: string
  hotel: string
  hotelName?: string
  source: string
  language: string
  score?: number
  url?: string
  author?: string
  title?: string
  hotelId?: string
  apartamento?: string
  allProblems?: ProblemAnalysis[]
  deleted?: boolean // Campo para marcar feedbacks excluídos
  edited?: boolean // Campo para marcar feedbacks editados
  importId?: string // ID da importação/análise
  // Flags de sugestão (persistidas junto ao feedback)
  has_suggestion?: boolean

  suggestion_type?: 'only' | 'mixed' | 'none' | 'only_suggestion' | 'with_criticism' | 'with_praise'

  suggestion_summary?: string
}

import { User as FirebaseUser } from "firebase/auth";

export type User = FirebaseUser;

export interface Analysis {
  id: string;
  hotelId: string;
  hotelName: string;
  importDate: any; // Timestamp do Firestore
  data: Feedback[]; 
  analysis: {
    totalFeedbacks: number;
    averageRating: number;
    positiveSentiment: number;
    responseRate: number;
    hotelDistribution: Array<any>;
    sourceDistribution: Array<any>;
    languageDistribution: Array<any>;
    ratingDistribution: Array<any>;
    sectorDistribution: Array<any>;
    keywordDistribution: Array<any>;
    sentimentTrend: Array<any>;
    recentFeedbacks: Feedback[];
    problemDistribution: Array<any>;
    apartamentoDistribution: Array<any>;
    [key: string]: any; // Para outras propriedades
  };
}