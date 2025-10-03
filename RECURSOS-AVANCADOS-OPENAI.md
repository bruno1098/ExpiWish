# 🚀 Recursos Avançados OpenAI - ExpiWish

## 1. Sistema de Reranking Multi-Signal

**Arquivo**: `lib/reranking-service.ts`

### O que é?
Sistema que combina múltiplos sinais para reordenar candidatos e melhorar precisão da seleção de keywords/problemas.

### Sinais Utilizados (com pesos):
1. **Embedding Score (40%)**: Similaridade semântica base
2. **Structural Score (30%)**: Coerência departamento-keyword (validação estrutural)
3. **Frequency Score (15%)**: Prior probability (keywords mais usadas têm prioridade)
4. **Context Score (15%)**: Análise sintática da frase (palavras presentes, negação/afirmação)

### Como funciona:
```typescript
// Entrada: candidatos do embedding + texto do usuário
const rankedCandidates = rerankCandidates(
  candidates,           // Array de candidatos com similarity_score
  userText,            // Texto original do feedback
  requiredDepartment   // Departamento específico (opcional)
);

// Saída: candidatos reordenados com score combinado
// [
//   { label: "A&B - Serviço", final_score: 0.82, reranking_signals: {...} },
//   { label: "A&B - Gastronomia", final_score: 0.71, ... }
// ]
```

### Vantagens:
- **Penalização forte**: Keywords com departamento errado estruturalmente recebem score 0
- **Aprendizado online**: Frequência atualizada dinamicamente com `updateKeywordFrequency()`
- **Contexto linguístico**: Detecta negações ("não foi bom") e ajusta score
- **Debugging**: Logs detalhados de top 3 com breakdown de scores

### Integração:
```typescript
// No analyze-feedback route, após buscar candidatos:
const candidates = await taxonomyService.findCandidates(text, "keywords", 10);
const rerankedCandidates = rerankCandidates(candidates, text, issue.department);

// Usar top 1 reranked ao invés de top 1 original
const bestKeyword = rerankedCandidates[0];
```

---

## 2. Structured Outputs (JSON Schema Nativo)

**Arquivo**: `lib/structured-outputs-schema.ts`

### O que é?
Feature nativa do GPT-4 que **garante 100% de conformidade** com JSON Schema, eliminando parsing errors.

### Diferença vs Function Calling tradicional:
| Feature | Function Calling | Structured Outputs |
|---------|------------------|-------------------|
| Conformidade JSON | ~95% (ocasionais erros) | 100% garantido |
| Parsing errors | Requer try/catch | Zero erros |
| Performance | Bom | Melhor (menos retries) |
| Tipos complexos | Limitado | anyOf, allOf, nested objects |
| Validação enums | Manual | Automática |

### Schemas Disponíveis:

#### 1. `feedbackClassificationSchema`
Schema completo com metadata de qualidade:
```typescript
{
  sentiment: 1-5,
  has_suggestion: boolean,
  suggestion_type: enum,
  issues: [
    {
      keyword: string,
      department: string,
      problem: string,
      problem_detail: string,
      confidence: 0-1  // NOVO: confiança da classificação
    }
  ],
  classification_quality: {  // NOVO: metadata de qualidade
    overall_confidence: 0-1,
    ambiguity_level: "low" | "medium" | "high",
    requires_human_review: boolean,
    reasoning: string  // Explicação da decisão
  }
}
```

**Vantagens**:
- Detecta classificações incertas automaticamente
- Fornece reasoning para auditoria
- Permite filtrar feedbacks que precisam revisão humana

#### 2. `suggestionAnalysisSchema`
Schema especializado para sugestões:
```typescript
{
  suggestion_category: "nova_amenidade" | "melhoria_servico" | ...,
  feasibility: "easy" | "moderate" | "difficult",
  impact_potential: "low" | "medium" | "high",
  departments_involved: ["A&B", "Tecnologia"],
  extracted_suggestion: "Adicionar opções veganas no café da manhã"
}
```

**Uso**: Pipeline em 2 etapas quando `has_suggestion = true`:
1. Classificação geral (schema principal)
2. Análise aprofundada da sugestão (schema de sugestão)

#### 3. `contextualSentimentSchema`
Schema para sentimento contextual quando ambíguo:
```typescript
{
  sentiment_breakdown: {
    positive_aspects: ["Localização ótima", "Staff atencioso"],
    negative_aspects: ["Quarto sujo", "Demora no check-in"],
    neutral_aspects: ["Preço na média"]
  },
  dominant_sentiment: 2,  // Insatisfeito (negativos dominam)
  sentiment_justification: "Apesar de elogiar localização..."
}
```

**Uso**: Quando `classification_quality.ambiguity_level === "high"`, fazer segunda chamada para análise contextual.

### Como Integrar:

```typescript
import { feedbackClassificationSchema, validateFeedbackClassification } from './structured-outputs-schema';

// No openai-client.ts, substituir function calling por response_format:
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  response_format: feedbackClassificationSchema,  // ← Usar schema
  temperature: 0.2
});

// Parse sempre bem-sucedido (garantido):
const result = JSON.parse(completion.choices[0].message.content);

// Validação adicional (double-check):
if (!validateFeedbackClassification(result)) {
  throw new Error("Schema validation failed");
}

// Type-safe:
const classification: FeedbackClassification = result;
console.log(`Confidence: ${classification.classification_quality.overall_confidence}`);
```

### Benefícios Imediatos:
1. **Zero parsing errors**: Elimina try/catch de JSON.parse
2. **Type-safety**: Interfaces TypeScript geradas automaticamente
3. **Metadata de qualidade**: Saber quando classificação é incerta
4. **Debugging melhorado**: Reasoning field explica decisões
5. **Pipeline em etapas**: Schemas especializados para sugestões e ambiguidade

---

## 3. Outras Features OpenAI Recomendadas

### A. Fine-tuning GPT-4 (gpt-4o-mini-2024-07-18)

**Quando usar**:
- Depois de coletar 500+ feedbacks classificados manualmente
- Para ensinar padrões específicos do domínio hoteleiro
- Reduzir dependência de prompts longos

**Processo**:
1. Exportar feedbacks + classificações corretas no formato JSONL
2. Upload dataset via API: `openai.files.create()`
3. Criar fine-tuning job: `openai.fine_tuning.jobs.create()`
4. Treinar ~2-4 horas
5. Usar modelo customizado: `model: "ft:gpt-4o-mini:org:model_id"`

**Vantagens**:
- 30-50% melhoria na precisão para domínio específico
- Latência menor (prompts mais curtos)
- Custo reduzido a longo prazo

### B. Batch API (50% de desconto)

**Quando usar**:
- Importações grandes de CSV/XLSX
- Reprocessamento de histórico
- Análises não urgentes

**Como funciona**:
```typescript
// Criar arquivo batch (JSONL):
const batchRequests = feedbacks.map(f => ({
  custom_id: f.id,
  method: "POST",
  url: "/v1/chat/completions",
  body: {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Classifique: ${f.text}` }],
    response_format: feedbackClassificationSchema
  }
}));

// Upload e executar:
const batchFile = await openai.files.create({
  file: Buffer.from(batchRequests.map(r => JSON.stringify(r)).join('\n')),
  purpose: "batch"
});

const batch = await openai.batches.create({
  input_file_id: batchFile.id,
  endpoint: "/v1/chat/completions",
  completion_window: "24h"
});

// Polling até completar:
while (batch.status !== "completed") {
  await sleep(60000);
  batch = await openai.batches.retrieve(batch.id);
}

// Download resultados:
const outputFile = await openai.files.content(batch.output_file_id);
```

**Vantagens**:
- 50% de desconto vs API síncrona
- Processa milhares de feedbacks overnight
- Retries automáticos

### C. text-embedding-3-large (Embeddings Melhores)

**Atual**: `text-embedding-3-small` (1536 dimensões)  
**Upgrade**: `text-embedding-3-large` (3072 dimensões)

**Comparação**:
| Métrica | small | large |
|---------|-------|-------|
| Dimensões | 1536 | 3072 |
| Precisão MTEB | 62.3% | 64.6% |
| Custo/1M tokens | $0.02 | $0.13 |
| Latência | ~100ms | ~150ms |

**Quando vale a pena**:
- Feedbacks muito curtos/ambíguos
- Necessidade de máxima precisão
- Budget permite (6.5x mais caro)

**Como testar**:
```typescript
// Em embeddings-service.ts:
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-large",  // ← Trocar aqui
  input: text
});
```

### D. Logprobs (Debugging de Incerteza)

**O que é**: Retorna log-probabilidades dos tokens gerados, revelando incerteza do modelo.

**Como usar**:
```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  logprobs: true,
  top_logprobs: 5  // Top 5 tokens mais prováveis em cada posição
});

// Analisar incerteza:
const avgLogProb = completion.choices[0].logprobs.content
  .map(t => t.logprob)
  .reduce((a, b) => a + b, 0) / completion.choices[0].logprobs.content.length;

if (avgLogProb < -1.5) {
  console.warn("Classificação incerta - modelo hesitante");
}
```

**Uso prático**: Detectar quando modelo está "adivinhando" vs confiante.

---

## 4. Roadmap de Implementação

### Fase 1: Melhorias Imediatas (1-2 dias)
- [x] Sistema de reranking multi-signal
- [x] Structured outputs schemas
- [ ] Integrar reranking no analyze-feedback route
- [ ] Migrar de function calling para structured outputs

### Fase 2: Metadata de Qualidade (3-5 dias)
- [ ] Adicionar campos de confiança em todas classificações
- [ ] Dashboard para feedbacks com `requires_human_review: true`
- [ ] Sistema de feedback loop (usuários corrigem classificações)

### Fase 3: Fine-tuning (1-2 semanas)
- [ ] Coletar 500+ feedbacks classificados manualmente
- [ ] Preparar dataset JSONL
- [ ] Treinar modelo customizado
- [ ] A/B test: modelo base vs fine-tuned

### Fase 4: Batch Processing (1 semana)
- [ ] Implementar pipeline batch para importações grandes
- [ ] Sistema de queueing para análises overnight
- [ ] Redução de 50% no custo de processamento em lote

---

## 5. Monitoramento e Métricas

### Métricas Recomendadas:
1. **Reranking Impact**: % de vezes que top 1 muda após reranking
2. **Confidence Distribution**: Histograma de `overall_confidence`
3. **Human Review Rate**: % de feedbacks com `requires_human_review: true`
4. **Correction Rate**: % de classificações corrigidas manualmente
5. **Structural Violations**: Quantas vezes validação estrutural pega erros

### Dashboard Sugerido:
```
┌─────────────────────────────────────────────┐
│ 📊 AI Quality Metrics (Últimos 30 dias)    │
├─────────────────────────────────────────────┤
│ Total Classificações: 1,243                 │
│ Confidence Média: 0.87                      │
│ Reranking Changes: 18.3%                    │
│ Structural Corrections: 42 (3.4%)           │
│ Human Review Queue: 37 (3.0%)               │
│                                              │
│ [Ver Feedbacks Incertos] [Export Métricas] │
└─────────────────────────────────────────────┘
```

---

## 6. Custos Estimados

### Setup Atual (text-embedding-3-small + gpt-4o-mini):
- Embedding: 1M tokens = $0.02
- Classification: 1M tokens = $0.15
- Custo médio por feedback: ~$0.0003

### Com Melhorias:
| Feature | Impacto no Custo | Vale a pena? |
|---------|------------------|--------------|
| Structured Outputs | 0% | ✅ Sim (zero custo extra) |
| Reranking | 0% | ✅ Sim (local, sem API calls) |
| text-embedding-3-large | +550% | ⚠️ Só se precisão crítica |
| Batch API | -50% | ✅ Sim (importações grandes) |
| Fine-tuning | -20% a longo prazo | ✅ Sim (após 10k+ feedbacks) |

### Recomendação:
1. Implementar structured outputs (grátis, grande benefício)
2. Usar batch API para importações (50% desconto)
3. Aguardar mais dados para fine-tuning
4. Evitar embedding-3-large por enquanto (custo alto)

---

## 7. Links e Documentação

- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Fine-tuning GPT-4](https://platform.openai.com/docs/guides/fine-tuning)
- [Batch API](https://platform.openai.com/docs/guides/batch)
- [Embeddings Comparison](https://openai.com/index/new-embedding-models-and-api-updates/)
- [Function Calling vs Structured Outputs](https://platform.openai.com/docs/guides/function-calling)
