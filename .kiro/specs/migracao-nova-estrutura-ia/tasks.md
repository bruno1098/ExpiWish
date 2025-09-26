# Implementation Plan

## Task Overview

Este plano implementa a migração para nova estrutura de IA mantendo compatibilidade total com componentes existentes. As tarefas priorizam mudanças na API e criação de camadas de adaptação, evitando modificações nos arquivos de análise e dashboard.

## Implementation Tasks

- [ ] 1. Criar Camada de Compatibilidade da IA
  - Implementar adaptador que converte nova estrutura para formato atual
  - Garantir que componentes existentes continuem funcionando sem modificações
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [x] 1.1 Implementar AI Compatibility Adapter
  - Criar arquivo `lib/ai-compatibility-adapter.ts`
  - Implementar função `adaptNewAIToLegacyFormat()` que converte múltiplas issues para campos consolidados
  - Mapear novos campos (has_suggestion, confidence) para estrutura existente
  - _Requirements: 1.1, 3.1_

- [x] 1.2 Modificar API de Análise para Usar Adaptador
  - Atualizar `app/api/analyze-feedback/route.ts` para usar camada de compatibilidade
  - Manter resposta no formato esperado pelos componentes existentes
  - Adicionar campos opcionais sem quebrar compatibilidade
  - _Requirements: 1.2, 3.2_

- [x] 1.3 Implementar Consolidação de Múltiplas Issues
  - Criar lógica para concatenar múltiplos keywords com separador ";"
  - Consolidar múltiplos departamentos e problemas mantendo compatibilidade
  - Preservar informação detalhada em campo `allProblems` opcional
  - _Requirements: 1.1, 3.2_

- [ ] 2. Criar Sistema de Gerenciamento de Embeddings
  - Implementar interface administrativa para gerar embeddings globalmente
  - Criar detecção automática de embeddings na importação
  - _Requirements: 7.1, 7.2, 8.1, 8.2_

- [x] 2.1 Implementar API de Status de Embeddings
  - Criar endpoint `app/api/embeddings-status/route.ts`
  - Verificar se embeddings existem e retornar status detalhado
  - Incluir informações sobre versão, data de geração e contadores
  - _Requirements: 7.1, 9.2_

- [x] 2.2 Criar Interface Administrativa de IA
  - Implementar página `app/admin/ai-configuration/page.tsx`
  - Adicionar botão "Gerar Embeddings da IA" com progresso em tempo real
  - Mostrar status atual dos embeddings e métricas
  - _Requirements: 7.1, 7.2, 9.1, 9.2_

- [x] 2.3 Implementar Geração de Embeddings com UI
  - Modificar `app/api/generate-embeddings/route.ts` para suportar progresso em tempo real
  - Adicionar WebSocket ou Server-Sent Events para atualizações de progresso
  - Implementar tratamento de erros com mensagens claras para usuários
  - _Requirements: 7.2, 7.3, 9.4_

- [ ] 3. Adicionar Detecção Automática na Importação
  - Modificar minimamente ImportPageContent.tsx para verificar embeddings
  - Criar modal explicativo quando embeddings não existem
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 3.1 Implementar Verificação de Embeddings na Importação
  - Adicionar função `checkEmbeddingsBeforeImport()` em ImportPageContent.tsx
  - Verificar status de embeddings antes de iniciar processamento
  - Mostrar modal explicativo se embeddings não existem
  - _Requirements: 10.1, 10.2_

- [x] 3.2 Criar Modal de Embeddings Requeridos
  - Implementar componente `EmbeddingsRequiredModal` 
  - Explicar importância dos embeddings para usuários
  - Oferecer opções: gerar embeddings (admin) ou contatar admin (staff)
  - _Requirements: 10.3, 10.4_

- [x] 3.3 Implementar Fluxo de Geração Durante Importação
  - Permitir que admins gerem embeddings diretamente do modal de importação
  - Continuar importação automaticamente após geração bem-sucedida
  - Implementar fallback para análise textual se usuário escolher prosseguir
  - _Requirements: 10.5, 7.2_

- [ ] 4. Implementar Sistema de Fallbacks Inteligentes
  - Criar estratégia de fallback para quando embeddings não existem
  - Garantir que sistema funcione mesmo com falhas na nova IA
  - _Requirements: 11.2, 11.3, 11.4_

- [x] 4.1 Implementar Fallback Strategy na API
  - Modificar `app/api/analyze-feedback/route.ts` com múltiplos níveis de fallback
  - Primeiro: nova IA com embeddings, segundo: análise textual, terceiro: classificação básica
  - Logar tentativas de fallback para monitoramento
  - _Requirements: 11.2, 11.3_

- [x] 4.2 Criar Função de Classificação Básica
  - Implementar `createBasicFeedback()` para casos extremos de fallback
  - Garantir que sempre retorna estrutura válida mesmo em falhas completas
  - Marcar feedbacks com fallback para revisão posterior
  - _Requirements: 11.3, 11.4_

- [x] 4.3 Implementar Tratamento de Erros Gracioso
  - Adicionar tratamento específico para diferentes tipos de erro (timeout, rate limit, etc.)
  - Implementar retry automático com backoff exponencial
  - Garantir que erros não interrompam fluxo de importação
  - _Requirements: 11.4, 11.5_

- [ ] 5. Garantir Compatibilidade com Dados Existentes
  - Testar que dados antigos continuam funcionando nos dashboards
  - Implementar migração gradual sem quebras
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.1 Implementar Detecção de Formato de Dados
  - Criar função para detectar se feedback usa formato antigo ou novo
  - Aplicar adaptações apenas quando necessário
  - Manter performance para dados que já estão no formato correto
  - _Requirements: 6.1, 6.2_

- [x] 5.2 Criar Testes de Compatibilidade
  - Implementar testes automatizados para dados antigos e novos
  - Verificar que dashboards funcionam com dados mistos
  - Testar cenários de migração gradual
  - _Requirements: 6.3, 6.4_

- [ ] 5.3 Implementar Migração de Dados Opcional
  - Criar endpoint para reprocessar dados antigos com nova IA (opcional)
  - Permitir que admins migrem dados gradualmente
  - Manter dados originais como backup durante migração
  - _Requirements: 6.4, 6.5_

- [ ] 6. Adicionar Melhorias Incrementais nos Dashboards
  - Aproveitar novos campos quando disponíveis sem quebrar funcionalidade
  - Adicionar visualizações de sugestões e confidence scores
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6.1 Implementar Visualização de Sugestões
  - Modificar dashboards para mostrar sugestões quando disponíveis
  - Adicionar seção específica para feedbacks com sugestões
  - Criar filtros para visualizar apenas feedbacks com sugestões
  - _Requirements: 5.2, 5.4_

- [ ] 6.2 Adicionar Indicadores de Confidence
  - Mostrar indicadores visuais de confidence nos dashboards
  - Priorizar feedbacks com baixo confidence para revisão
  - Adicionar filtros por nível de confidence
  - _Requirements: 5.3, 5.4_

- [ ] 6.3 Implementar Visualização de Problem Details
  - Aproveitar campo `problem_detail` para mostrar informações mais específicas
  - Adicionar tooltips ou modais com detalhes expandidos
  - Manter compatibilidade com dados que não têm detalhes
  - _Requirements: 5.4, 5.5_

- [ ] 7. Implementar Monitoramento e Métricas
  - Adicionar logging para monitorar uso da nova IA vs fallbacks
  - Criar métricas de performance e qualidade
  - _Requirements: 11.1, 11.5_

- [x] 7.1 Implementar Logging de Performance
  - Adicionar logs detalhados sobre uso de embeddings vs fallback
  - Monitorar tempo de processamento da nova IA
  - Registrar taxa de sucesso e tipos de erro
  - _Requirements: 11.1, 11.5_

- [ ] 7.2 Criar Dashboard de Métricas da IA
  - Implementar página administrativa para visualizar métricas da IA
  - Mostrar estatísticas de uso, performance e qualidade
  - Alertar sobre problemas como alta taxa de fallback
  - _Requirements: 9.3, 9.5_

- [ ] 7.3 Implementar Alertas Automáticos
  - Criar sistema de alertas para embeddings não disponíveis
  - Notificar admins sobre alta taxa de erros ou fallbacks
  - Implementar alertas de performance degradada
  - _Requirements: 9.5, 11.5_

- [ ] 8. Testes de Integração e Validação Final
  - Executar testes completos de compatibilidade
  - Validar que todas as funcionalidades existentes continuam funcionando
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8.1 Executar Testes de Regressão Completos
  - Testar todas as funcionalidades existentes com nova estrutura
  - Verificar dashboards, filtros, exportações e relatórios
  - Validar que performance não foi degradada
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8.2 Testar Cenários de Produção
  - Simular importação de grandes volumes com nova IA
  - Testar comportamento com falhas de rede e timeouts
  - Validar recuperação automática e fallbacks
  - _Requirements: 4.4, 4.5, 11.1_

- [ ] 8.3 Validar Experiência do Usuário
  - Testar fluxo completo de geração de embeddings
  - Verificar que modais e mensagens são claros e úteis
  - Validar que usuários conseguem usar sistema sem conhecimento técnico
  - _Requirements: 7.1, 7.2, 10.3, 10.4_