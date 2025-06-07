export interface AnalysisResult {
  rating: number;
  keyword: string;
  sector: string;
  problem: string;
  allProblems?: ProblemAnalysis[];
}

export interface ProblemAnalysis {
  keyword: string;
  sector: string;
  problem: string;
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
  hotel: string
  source: string
  language: string
  score?: number
  url?: string
  author?: string
  title?: string
  hotelId?: string
  apartamento?: string
  allProblems?: ProblemAnalysis[]
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