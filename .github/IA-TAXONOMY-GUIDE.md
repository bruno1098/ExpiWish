# ExpiWish – Guia da IA, Firebase e Taxonomia

Este documento resume como o pipeline de IA funciona, onde os dados vivem no Firebase e quais arquivos precisam ser atualizados quando você adiciona, edita ou remove departamentos, keywords e problems.

## 1. Camadas principais do sistema
- **Frontend (Next.js App Router)**: telas em `app/` acionam a análise via `lib/openai-client.ts`, que chama `POST /api/analyze-feedback`.
- **API Serverless**: rotas em `app/api/*` executam toda a lógica pesada (classificação, geração de embeddings, manutenção de taxonomia, etc.).
- **Firebase**: `lib/firebase.ts` inicializa Firestore, Auth, Realtime DB e Storage. A coleção crítica para a taxonomia é `dynamic-lists/global-lists`.
- **Serviços de suporte**: 
  - `lib/firestore-service.ts` salva análises (`analyse/{hotel}/feedbacks/{id}`) e gerencia action plans.
  - `lib/analytics-service.ts`, `lib/performance-logger.ts` e `lib/dev-logger.ts` observam uso, performance e logs.
  - `lib/ai-compatibility-adapter.ts` converte a resposta moderna em formato legado consumido pelas telas.

## 2. Fluxo completo da análise de IA
1. **Entrada** (`lib/openai-client.ts`): coleta texto, recupera a OpenAI API key do usuário e chama `/api/analyze-feedback`.
2. **Pré-checagens** (`app/api/analyze-feedback/route.ts`):
   - Rate limiting (180 req/min), circuit breaker e cache em memória (30 min) para textos repetidos.
   - Validação básica do payload e normalização do texto.
3. **Carregamento da taxonomia** (`lib/taxonomy-service.ts`):
   - `loadTaxonomy()` busca departamentos, keywords e problems de `dynamic-lists/global-lists`, aplica cache com TTL configurado em `TaxonomyConfig`.
   - Quando `hasEmbeddings=true`, usa vetores pré-gerados salvos em `dynamic-lists/global-lists/embeddings/*`.
4. **Busca de candidatos** (`findCandidates`):
   - Expande o texto com sinônimos (`expandUserQuery`, `lib/semantic-enrichment.ts`).
   - Gera embedding do texto com `generateEmbedding` (`lib/embeddings-service.ts`).
   - Calcula cosine similarity com embeddings das keywords/problemas ativos e aplica thresholds específicos (0.35/0.45 por padrão).
   - Fallback: se nenhum candidato passa no threshold, usa busca permissiva ou consulta direta a todos os itens.
5. **Prompt dinâmico + chamada OpenAI**:
   - `createDynamicPrompt()` injeta regras rígidas, exemplos e a lista de candidatos em um prompt estruturado.
   - `chat.completions.create` é chamado com `gpt-4o-mini` (upgrade automático para `gpt-4o` quando a confiança < 0.6).
   - Usa Structured Outputs via função `classify_feedback` (schema em `lib/structured-outputs-schema.ts`).
6. **Pós-processamento**:
   - `processLLMResponse()` valida departamentos/keywords, aplica thresholds, registra `taxonomy_version` e garante consistência através de `taxonomy-validation`.
   - Cria propostas automáticas (`createTaxonomyProposal`) quando a IA sugere novos termos.
   - `adaptNewAIToLegacyFormat()` garante compatibilidade com dashboards existentes.
7. **Persistência e uso**:
   - Resultado compatível é devolvido ao frontend.
   - Ao importar planilhas (`app/import/*`), os feedbacks processados são salvos com `saveAnalysis()` (`lib/firestore-service.ts`), ficando disponíveis para dashboards/admin.

## 3. Firebase e estrutura de dados
- **Configuração** (`lib/firebase.ts`): contém o objeto `firebaseConfig`. Qualquer troca de projeto Firebase deve ser feita aqui.
- **Coleções principais**:
  - `analyse/{hotel}/feedbacks/{doc}`: feedbacks classificados e metadados da importação.
  - `hotels`, `users`: controle de acesso e escopo por hotel.
  - `action-plans/{hotelSlug}/plans/{doc}`: planos de ação vinculados a problems.
  - `dynamic-lists/global-lists`: fonte da verdade da taxonomia dinâmica.
    - Campos principais: `departments`, `keywords`, `problems` (ou `keywords_with_embeddings`, `problems_with_embeddings`), `meta`, `config`.
    - Subcoleção `embeddings`: documentos `keywords_chunk_{n}` e `problems_chunk_{n}` guardam até 50 itens com vetores.
    - Subcoleção `proposals`: sugestões de novos itens enviadas automaticamente pela IA.
- **Versionamento e manutenção**:
  - `lib/taxonomy-version-manager.ts` calcula hashes e versões com base nos arrays (evita reprocessar embeddings sem necessidade).
  - `incrementTaxonomyVersion()` escreve `meta.version` e zera o cache quando há alterações manuais.

## 4. Taxonomia dinâmica e embeddings
- **Carregamento e cache** (`lib/taxonomy-service.ts`):
  - `loadDepartments()`, `loadKeywords()`, `loadProblems()` lidam com diferentes formatos (arrays simples, mapas por departamento ou estruturas chunked com embeddings).
  - `taxonomyCache` mantém os dados por `cache_expiry_minutes` (default 30) e é invalidado ao atualizar `meta.version`.
- **Busca e similaridade**:
  - `generateEmbedding()` (OpenAI `text-embedding-3-small`) possui cache próprio de 24h para reduzir custos.
  - `cosineSimilarity()` e `findTopSimilar()` fornecem utilidades de busca.
- **Enriquecimento semântico** (`lib/semantic-enrichment.ts`):
  - `KEYWORD_SEMANTIC_CONTEXT` lista sinônimos, termos relacionados e exemplos para cada keyword.
  - `generateEnrichedKeywordText()`/`generateEnrichedProblemText()` combinam esses dados quando geramos embeddings, garantindo que o vetor represente o conceito e não apenas o rótulo literal.
  - `expandUserQuery()` injeta sinônimos e versões sem acento na query do hóspede antes de gerar o embedding do texto.
- **Validação estrutural** (`lib/taxonomy-validation.ts`):
  - `KEYWORD_DEPARTMENT_MAP` garante que keywords específicas permaneçam no departamento correto.
  - `autoCorrectDepartment()` corrige entradas quando a fonte de dados envia o departamento errado.
  - `filterKeywordsByDepartment()` reforça a coerência departamento ↔ keyword no pós-processamento da IA.
- **Geração em massa de embeddings** (`app/api/generate-embeddings/route.ts`):
  - Usa `generateBatchEmbeddings()` para processar keywords e problems em lotes de 20.
  - `PROBLEM_CONTEXT_DICT` descreve o significado de cada problem (191 entradas). É a base para reforçar o contexto dos embeddings e também serve como lista controlada de problems.
  - Após gerar, salva os chunks na subcoleção `embeddings` e atualiza os campos `keywords_with_embeddings`, `problems_with_embeddings`, além de marcar a versão atual em `taxonomy_version_info`.

## 5. Onde alterar departamentos, keywords e problems
Adicionar ou remover itens envolve **dados no Firebase** e alguns **arquivos hard-coded** que ajudam a IA com contexto. A tabela abaixo resume:

| O que mudar | Onde alterar | Por quê |
| --- | --- | --- |
| Adicionar/remover item oficial | `dynamic-lists/global-lists` (ou via `lib/dynamic-lists-service.ts`, `createKeyword`, `createProblem`) | Fonte da verdade consumida por `loadTaxonomy()`.
| Contexto semântico de keywords | `lib/semantic-enrichment.ts` (`KEYWORD_SEMANTIC_CONTEXT`) | Mantém sinônimos e exemplos; melhora embeddings e query expansion.
| Contexto semântico de problems | `app/api/generate-embeddings/route.ts` (`PROBLEM_CONTEXT_DICT`) | Define descrições e variações usadas na geração de embeddings dos problems.
| Mapeamento keyword ↔ departamento | `lib/taxonomy-validation.ts` (`KEYWORD_DEPARTMENT_MAP`) | Garante coerência estrutural e evita classificações incorretas.
| Thresholds e cache da taxonomia | `lib/taxonomy-service.ts` (`DEFAULT_CONFIG`) | Ajuste quando incluir muitos novos itens ou quiser mudar sensibilidade.
| Adaptações do frontend legado | `lib/ai-compatibility-adapter.ts` | Só necessário se um novo campo estrutural for criado.

## 6. Checklist para adicionar/atualizar itens
1. **Atualizar o documento do Firebase**:
   - Use o painel Admin, `lib/dynamic-lists-service.ts` (UI) ou as helpers `createKeyword`/`createProblem` se quiser gerar embeddings imediatamente.
   - Garanta que cada item tenha `status: 'active'` para entrar nos candidatos.
2. **Sincronizar hard-coded contextos**:
   - Inclua a nova keyword em `KEYWORD_SEMANTIC_CONTEXT` com sinônimos, termos relacionados e exemplos reais.
   - Inclua o novo problem (no formato `Departamento - Nome do Problema`) em `PROBLEM_CONTEXT_DICT` com descrições claras.
   - Atualize `KEYWORD_DEPARTMENT_MAP` para que o validador identifique o departamento correto.
3. **Regenerar embeddings**:
   - Chame a rota interna para recriar os vetores.
   ```bash
   curl -X POST http://localhost:3000/api/generate-embeddings \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"SUA_OPENAI_KEY","force":true}'
   ```
   - A rota grava os chunks em `dynamic-lists/global-lists/embeddings/*` e atualiza `taxonomy_version_info`.
4. **Invalidar caches**:
   - Rode `await incrementTaxonomyVersion('seu-usuario')` (por script ou console) **ou** reinicie o servidor para limpar `taxonomyCache`.
   - Opcional: chamar `clearEmbeddingCache()` se estiver executando scripts dentro do mesmo processo.
5. **Verificar na prática**:
   - Faça um feedback de teste com palavras que deveriam mapear para o novo item.
   - Confira os logs de `/api/analyze-feedback` para ver se o item aparece na lista de candidatos e se foi escolhido pela IA.

## 7. Referências rápidas
- **Carga e cache da taxonomia**: `lib/taxonomy-service.ts`
- **Tipos e interfaces oficiais**: `lib/taxonomy-types.ts`
- **Validação e inferência de departamento**: `lib/taxonomy-validation.ts`
- **Contextos semânticos**: `lib/semantic-enrichment.ts`
- **Embeddings utilitários**: `lib/embeddings-service.ts`
- **Rota de geração em massa**: `app/api/generate-embeddings/route.ts`
- **Fluxo completo da IA**: `app/api/analyze-feedback/route.ts`
- **Compatibilidade com frontend legado**: `lib/ai-compatibility-adapter.ts`
- **Persistência e listas dinâmicas**: `lib/firestore-service.ts`, `lib/dynamic-lists-service.ts`

Com esse mapa fica fácil localizar onde cada peça da IA vive e quais arquivos precisam ser ajustados quando a taxonomia muda. Sempre que adicionar itens, mantenha o contexto semântico atualizado e regenere os embeddings para que o motor continue preciso.
