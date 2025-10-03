/**
 * Schemas para OpenAI Structured Outputs
 * 
 * Structured Outputs é uma feature nativa do GPT-4 que garante 100% de conformidade
 * com JSON Schema, eliminando respostas malformadas.
 * 
 * Vantagens vs Function Calling tradicional:
 * - Garantia matemática de JSON válido (zero parsing errors)
 * - Suporte a tipos complexos (anyOf, allOf, nested objects)
 * - Melhor performance (menos retries)
 * - Validação automática de enums e constraints
 * 
 * Docs: https://platform.openai.com/docs/guides/structured-outputs
 */

/**
 * Schema para classificação de feedback completa
 * Usa JSON Schema Draft 7 com strict: true
 */
export const feedbackClassificationSchema = {
  type: "json_schema",
  json_schema: {
    name: "feedback_classification",
    strict: true, // IMPORTANTE: garante conformidade 100%
    schema: {
      type: "object",
      properties: {
        // Sentimento (1-5)
        sentiment: {
          type: "integer",
          enum: [1, 2, 3, 4, 5],
          description: "1=Muito insatisfeito, 2=Insatisfeito, 3=Neutro, 4=Satisfeito, 5=Muito satisfeito"
        },
        
        // Detecção de sugestões
        has_suggestion: {
          type: "boolean",
          description: "O feedback contém sugestões de melhoria?"
        },
        
        suggestion_type: {
          type: "string",
          enum: ["none", "only_suggestion", "with_criticism", "with_praise", "mixed"],
          description: "Tipo de sugestão presente no feedback"
        },
        
        // Problemas identificados (máximo 3)
        issues: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "Palavra-chave específica (ex: 'A&B - Café da manhã')"
              },
              department: {
                type: "string",
                description: "Departamento responsável (ex: 'A&B', 'Governança')"
              },
              problem: {
                type: "string",
                description: "Tipo de problema padronizado (ex: 'Demora no Atendimento')"
              },
              problem_detail: {
                type: "string",
                maxLength: 120,
                description: "Descrição objetiva do problema específico"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confiança da classificação (0-1)"
              }
            },
            required: ["keyword", "department", "problem", "problem_detail", "confidence"],
            additionalProperties: false
          }
        },
        
        // Metadata de qualidade
        classification_quality: {
          type: "object",
          properties: {
            overall_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confiança geral na classificação completa"
            },
            ambiguity_level: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Nível de ambiguidade do feedback original"
            },
            requires_human_review: {
              type: "boolean",
              description: "Classificação incerta, requer revisão humana?"
            },
            reasoning: {
              type: "string",
              maxLength: 200,
              description: "Breve explicação da decisão de classificação"
            }
          },
          required: ["overall_confidence", "ambiguity_level", "requires_human_review", "reasoning"],
          additionalProperties: false
        }
      },
      required: ["sentiment", "has_suggestion", "suggestion_type", "issues", "classification_quality"],
      additionalProperties: false
    }
  }
};

/**
 * Schema simplificado para sugestões de melhoria
 * Usado quando feedback é detectado como sugestão pura
 */
export const suggestionAnalysisSchema = {
  type: "json_schema",
  json_schema: {
    name: "suggestion_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        suggestion_category: {
          type: "string",
          enum: [
            "nova_amenidade",
            "melhoria_servico",
            "mudanca_processo",
            "adicao_cardapio",
            "ajuste_infraestrutura",
            "otimizacao_tecnologia",
            "outro"
          ],
          description: "Categoria da sugestão"
        },
        
        feasibility: {
          type: "string",
          enum: ["easy", "moderate", "difficult", "unknown"],
          description: "Viabilidade estimada de implementação"
        },
        
        impact_potential: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Potencial de impacto na satisfação"
        },
        
        departments_involved: {
          type: "array",
          items: {
            type: "string",
            enum: ["A&B", "Governança", "Manutenção", "Recepção", "Tecnologia", "Operações", "Lazer", "Outro"]
          },
          description: "Departamentos que precisam estar envolvidos"
        },
        
        extracted_suggestion: {
          type: "string",
          maxLength: 250,
          description: "Sugestão extraída e reformulada de forma clara"
        }
      },
      required: ["suggestion_category", "feasibility", "impact_potential", "departments_involved", "extracted_suggestion"],
      additionalProperties: false
    }
  }
};

/**
 * Schema para análise de sentimento contextual (quando ambíguo)
 * Usado como segundo passo quando sentimento inicial é incerto
 */
export const contextualSentimentSchema = {
  type: "json_schema",
  json_schema: {
    name: "contextual_sentiment",
    strict: true,
    schema: {
      type: "object",
      properties: {
        sentiment_breakdown: {
          type: "object",
          properties: {
            positive_aspects: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
              description: "Aspectos positivos mencionados"
            },
            negative_aspects: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
              description: "Aspectos negativos mencionados"
            },
            neutral_aspects: {
              type: "array",
              items: { type: "string" },
              maxItems: 5,
              description: "Aspectos neutros/factuais mencionados"
            }
          },
          required: ["positive_aspects", "negative_aspects", "neutral_aspects"],
          additionalProperties: false
        },
        
        dominant_sentiment: {
          type: "integer",
          enum: [1, 2, 3, 4, 5],
          description: "Sentimento dominante após análise contextual"
        },
        
        sentiment_justification: {
          type: "string",
          maxLength: 200,
          description: "Justificativa da decisão final de sentimento"
        }
      },
      required: ["sentiment_breakdown", "dominant_sentiment", "sentiment_justification"],
      additionalProperties: false
    }
  }
};

/**
 * Tipos TypeScript gerados dos schemas (type-safe)
 */
export interface FeedbackClassification {
  sentiment: 1 | 2 | 3 | 4 | 5;
  has_suggestion: boolean;
  suggestion_type: "none" | "only_suggestion" | "with_criticism" | "with_praise" | "mixed";
  issues: Array<{
    keyword: string;
    department: string;
    problem: string;
    problem_detail: string;
    confidence: number;
  }>;
  classification_quality: {
    overall_confidence: number;
    ambiguity_level: "low" | "medium" | "high";
    requires_human_review: boolean;
    reasoning: string;
  };
}

export interface SuggestionAnalysis {
  suggestion_category: "nova_amenidade" | "melhoria_servico" | "mudanca_processo" | "adicao_cardapio" | "ajuste_infraestrutura" | "otimizacao_tecnologia" | "outro";
  feasibility: "easy" | "moderate" | "difficult" | "unknown";
  impact_potential: "low" | "medium" | "high";
  departments_involved: Array<"A&B" | "Governança" | "Manutenção" | "Recepção" | "Tecnologia" | "Operações" | "Lazer" | "Outro">;
  extracted_suggestion: string;
}

export interface ContextualSentiment {
  sentiment_breakdown: {
    positive_aspects: string[];
    negative_aspects: string[];
    neutral_aspects: string[];
  };
  dominant_sentiment: 1 | 2 | 3 | 4 | 5;
  sentiment_justification: string;
}

/**
 * Validação adicional pós-parsing (double-check)
 */
export function validateFeedbackClassification(data: any): data is FeedbackClassification {
  if (!data || typeof data !== 'object') return false;
  
  // Validar sentiment
  if (![1, 2, 3, 4, 5].includes(data.sentiment)) return false;
  
  // Validar issues
  if (!Array.isArray(data.issues) || data.issues.length > 3) return false;
  
  for (const issue of data.issues) {
    if (!issue.keyword || !issue.department || !issue.problem || !issue.problem_detail) {
      return false;
    }
    if (typeof issue.confidence !== 'number' || issue.confidence < 0 || issue.confidence > 1) {
      return false;
    }
  }
  
  // Validar quality metadata
  if (!data.classification_quality || 
      typeof data.classification_quality.overall_confidence !== 'number' ||
      !['low', 'medium', 'high'].includes(data.classification_quality.ambiguity_level)) {
    return false;
  }
  
  return true;
}
