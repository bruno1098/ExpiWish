// Types para o novo sistema de taxonomy dinâmica

import { Timestamp } from 'firebase/firestore';

// Departamentos (fixo, somente leitura)
export interface Department {
  id: string;          // "A&B", "Limpeza", etc.
  label: string;       // "A&B", "Limpeza", etc.
  description?: string;
  active: boolean;
  order?: number;      // Para ordenação na UI
  created_at: Timestamp;
}

// Keywords (editável, dinâmico)
export interface Keyword {
  id: string;                    // UUID gerado
  label: string;                 // "A&B - Gastronomia"
  department_id: string;         // "A&B" (referência para Department)
  slug: string;                  // "aeb-gastronomia" (normalizado, único)
  aliases: string[];             // ["gastronomia", "culinária", "cuisine"]
  description?: string;          // Descrição curta para ajudar o LLM
  examples: string[];            // 2-5 frases de exemplo reais
  embedding?: number[];          // Vetor de embedding OpenAI
  status: 'active' | 'pending' | 'archived';
  
  // Metadados
  created_by: string;           // UID do usuário
  created_at: Timestamp;
  updated_at: Timestamp;
  version: number;
  
  // Controle de duplicatas
  duplicate_of?: string;        // ID da keyword principal (se for duplicata)
  merged_from?: string[];       // IDs que foram mesclados nesta
  similarity_score?: number;    // Score de similaridade com outras
}

// Problems (editável, dinâmico, transversal a departamentos)
export interface Problem {
  id: string;                   // UUID gerado
  label: string;                // "Demora no Atendimento"
  slug: string;                 // "demora-no-atendimento"
  aliases: string[];            // ["demora", "atendimento lento", "delay"]
  description?: string;
  examples: string[];
  embedding?: number[];
  status: 'active' | 'pending' | 'archived';
  
  // Aplicabilidade (opcional - se não definido, é transversal)
  applicable_departments?: string[];  // ["A&B", "Recepção"] ou vazio = todos
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;            // "Atendimento", "Estrutura", "Limpeza", etc.
  
  // Metadados
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: number;
  
  // Controle de duplicatas
  duplicate_of?: string;
  merged_from?: string[];
  similarity_score?: number;
}

// Meta informações do sistema de taxonomy
export interface TaxonomyMeta {
  version: number;              // Incrementa a cada mudança
  updated_at: Timestamp;
  updated_by: string;
  departments_count: number;
  keywords_count: number;
  problems_count: number;
  last_embedding_update: Timestamp;
  embedding_model: string;      // "text-embedding-3-small" 
}

// Resultado da classificação (nova estrutura)
export interface ClassificationResult {
  sentiment: 1 | 2 | 3 | 4 | 5;
  has_suggestion: boolean;
  suggestion_type: 'none' | 'improvement_only' | 'improvement_with_criticism' | 'improvement_with_praise' | 'mixed_feedback';
  suggestion_summary: string;
  
  // Issues identificados (até 3)
  issues: ClassificationIssue[];
  
  // Campo opcional para propor nova keyword
  proposed_keyword_label?: string;
  proposed_problem_label?: string;
  
  // NOVO: Raciocínio da IA (Chain of Thought)
  reasoning?: string;
  
  // Metadados da classificação
  taxonomy_version: number;
  confidence: number;           // 0-1
  needs_review: boolean;        // true se confidence < 0.5
  processing_time_ms: number;
  used_candidates: {
    keywords: string[];         // IDs das keywords candidatas
    problems: string[];         // IDs dos problems candidatos
  };
}

export interface ClassificationIssue {
  // IDs estáveis (não mudam mesmo se labels mudarem)
  department_id: string;
  keyword_id: string;
  problem_id: string;          // ou "EMPTY" para elogios
  
  // Labels para display (podem mudar sem quebrar gráficos)
  department_label: string;
  keyword_label: string;
  problem_label: string;
  
  // Detalhe específico do problema
  detail: string;              // max 120 chars
  
  // Metadados
  confidence: number;          // 0-1
  matched_by: 'embedding' | 'alias' | 'exact' | 'proposed' | 'direct';
}

// Candidatos para o LLM
export interface ClassificationCandidates {
  departments: Department[];
  keywords: KeywordCandidate[];    // Top-N por embedding
  problems: ProblemCandidate[];    // Top-N por embedding
  recall_method: 'embedding' | 'keyword_match' | 'hybrid';
  recall_score_threshold: number;
}

export interface KeywordCandidate {
  id: string;
  label: string;
  department_id: string;
  description?: string;
  examples: string[];
  similarity_score: number;    // 0-1 (cosine similarity)
  matched_by?: 'embedding' | 'alias' | 'exact' | 'proposed' | 'direct';  // 'direct' = análise direta sem embeddings
}

export interface ProblemCandidate {
  id: string;
  label: string;
  description?: string;
  examples: string[];
  applicable_departments?: string[];
  similarity_score: number;
  matched_by?: 'embedding' | 'alias' | 'exact' | 'proposed' | 'direct';  // 'direct' = análise direta sem embeddings
}

// Proposta de nova taxonomy
export interface TaxonomyProposal {
  id: string;
  type: 'keyword' | 'problem';
  proposed_label: string;
  department_id?: string;      // Para keywords
  context: string;             // Texto original que gerou a proposta
  
  // Dados auto-gerados
  suggested_slug: string;
  suggested_aliases: string[];
  suggested_examples: string[];
  
  // Status da proposta
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Timestamp;
  rejection_reason?: string;
  
  // Metadados
  created_by: string;          // Sistema ou usuário
  created_at: Timestamp;
  feedback_count: number;      // Quantos feedbacks geraram essa proposta
}

// Cache structure
export interface TaxonomyCache {
  version: number;
  departments: Department[];
  keywords: Keyword[];
  problems: Problem[];
  embeddings_index?: any;      // Índice de embeddings para busca rápida
  loaded_at: number;           // timestamp
  expires_at: number;          // timestamp
}

// Configurações do sistema
export interface TaxonomyConfig {
  embedding_model: string;              // "text-embedding-3-small"
  similarity_threshold: number;         // 0.35 (threshold geral, usado como fallback)
  similarity_threshold_keywords?: number;   // 0.35 (threshold específico para keywords)
  similarity_threshold_problems?: number;   // 0.45 (threshold específico para problems)
  fallback_threshold_keywords?: number;     // 0.25 (fallback permissivo para keywords)
  fallback_threshold_problems?: number;     // 0.35 (fallback moderado para problems)
  recall_top_n: number;                 // 15 (candidatos por embedding)
  min_confidence_threshold: number;     // 0.5 (abaixo = needs_review)
  auto_approve_threshold: number;       // 0.95 (aprovação automática de propostas)
  max_aliases_per_item: number;         // 10
  max_examples_per_item: number;        // 5
  cache_expiry_minutes: number;         // 30
}