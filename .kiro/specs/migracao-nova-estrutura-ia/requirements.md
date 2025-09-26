# Requirements Document

## Introduction

Este documento especifica a migração do sistema ExpiWish para suportar a nova estrutura de IA com múltiplas classificações, mantendo **total compatibilidade** com os arquivos existentes de análise e dashboard. A estratégia principal é **adaptar a API** para fornecer dados no formato esperado pelos componentes existentes, evitando mudanças disruptivas na interface.

## Requirements

### Requirement 1: Compatibilidade com Estrutura Existente

**User Story:** Como desenvolvedor, quero que a nova API de IA seja compatível com os componentes existentes, para que não precise reescrever as telas de análise e dashboard.

#### Acceptance Criteria

1. WHEN a API retorna a nova estrutura com múltiplas issues THEN deve converter automaticamente para o formato esperado pelos componentes existentes
2. WHEN um feedback tem múltiplas classificações THEN deve consolidar em campos únicos (keyword, sector, problem) mantendo compatibilidade
3. WHEN existem sugestões na nova estrutura THEN deve mapear para os campos esperados pelos dashboards
4. IF um feedback antigo não tem a nova estrutura THEN deve funcionar normalmente sem erros
5. WHEN há problem_details específicos THEN deve integrar com o sistema de análise existente

### Requirement 2: Migração da Tela de Import

**User Story:** Como usuário, quero que a importação de feedbacks use a nova IA inteligente, para que tenha classificações mais precisas com múltiplos aspectos.

#### Acceptance Criteria

1. WHEN importo um arquivo Excel THEN deve usar a nova API `/api/analyze-feedback` com embeddings
2. WHEN um feedback tem múltiplos aspectos THEN deve processar todas as issues retornadas pela IA
3. WHEN há sugestões detectadas THEN deve armazenar nos campos `has_suggestion`, `suggestion_type`, `suggestion_summary`
4. WHEN há múltiplas classificações THEN deve consolidar em formato compatível com `ImportPageContent.tsx`
5. WHEN o processamento falha THEN deve usar fallback mantendo funcionalidade existente

### Requirement 3: Adaptação da API para Compatibilidade

**User Story:** Como sistema, quero que a API forneça dados no formato esperado pelos componentes existentes, para que não haja quebras de funcionalidade.

#### Acceptance Criteria

1. WHEN a nova API retorna múltiplas issues THEN deve criar campos consolidados `keyword`, `sector`, `problem`
2. WHEN há múltiplos departamentos THEN deve concatenar com separador ";" mantendo compatibilidade
3. WHEN há sugestões THEN deve mapear para campos esperados pelos dashboards existentes
4. WHEN há confidence baixo THEN deve marcar para revisão mantendo fluxo atual
5. WHEN há problem_details THEN deve integrar com visualizações existentes

### Requirement 4: Preservação de Funcionalidades Existentes

**User Story:** Como usuário, quero que todas as funcionalidades atuais continuem funcionando, para que não perca produtividade durante a migração.

#### Acceptance Criteria

1. WHEN acesso dashboards existentes THEN devem funcionar normalmente com dados novos e antigos
2. WHEN filtro por departamentos/problemas THEN deve funcionar com dados consolidados
3. WHEN visualizo análises antigas THEN devem ser exibidas corretamente
4. WHEN uso funcionalidades de edição THEN devem funcionar com nova estrutura
5. WHEN exporto relatórios THEN devem incluir novos campos quando disponíveis

### Requirement 5: Melhorias Incrementais

**User Story:** Como usuário, quero aproveitar as melhorias da nova IA, para que tenha insights mais precisos sem perder funcionalidades.

#### Acceptance Criteria

1. WHEN a IA detecta múltiplos aspectos THEN deve mostrar informação consolidada nos dashboards
2. WHEN há sugestões detectadas THEN deve exibir em seções apropriadas
3. WHEN há confidence score THEN deve usar para priorizar revisões
4. WHEN há problem_details específicos THEN deve enriquecer visualizações existentes
5. WHEN há classificações mais precisas THEN deve melhorar qualidade dos insights

### Requirement 6: Migração de Dados Gradual

**User Story:** Como administrador, quero que dados antigos e novos coexistam, para que a migração seja suave e sem interrupções.

#### Acceptance Criteria

1. WHEN há dados no formato antigo THEN devem ser processados normalmente
2. WHEN há dados no formato novo THEN devem ser convertidos para compatibilidade
3. WHEN misturo dados antigos e novos THEN dashboards devem funcionar corretamente
4. WHEN reprocesso dados antigos THEN devem usar nova estrutura automaticamente
5. WHEN há inconsistências THEN deve usar fallbacks seguros

### Requirement 7: Gerenciamento de Embeddings

**User Story:** Como administrador, quero uma interface simples para gerar embeddings, para que o sistema funcione corretamente em produção sem conhecimento técnico.

#### Acceptance Criteria

1. WHEN acesso configurações administrativas THEN deve ter botão "Gerar Embeddings da IA"
2. WHEN clico em gerar embeddings THEN deve mostrar progresso e status em tempo real
3. WHEN embeddings não existem THEN sistema deve alertar e oferecer geração automática
4. WHEN embeddings estão desatualizados THEN deve sugerir regeneração
5. WHEN geração falha THEN deve mostrar erro claro e permitir retry

### Requirement 8: Suporte Multi-Hotel Inteligente

**User Story:** Como usuário que gerencia múltiplos hotéis, quero que embeddings sejam compartilhados entre hotéis, para que não precise gerar separadamente para cada um.

#### Acceptance Criteria

1. WHEN embeddings são gerados THEN devem ser globais para todos os hotéis
2. WHEN usuário troca de hotel THEN deve usar os mesmos embeddings automaticamente
3. WHEN não há embeddings THEN qualquer admin pode gerar para todos os hotéis
4. WHEN embeddings existem THEN todos os hotéis se beneficiam imediatamente
5. WHEN há atualizações na taxonomia THEN deve regenerar embeddings globalmente

### Requirement 9: Interface de Configuração de IA

**User Story:** Como administrador, quero uma tela dedicada para gerenciar a IA, para que possa monitorar e configurar o sistema facilmente.

#### Acceptance Criteria

1. WHEN acesso área administrativa THEN deve ter seção "Configuração da IA"
2. WHEN visualizo status da IA THEN deve mostrar se embeddings estão ativos
3. WHEN embeddings não existem THEN deve mostrar alerta e botão de ação
4. WHEN processo está rodando THEN deve mostrar progresso em tempo real
5. WHEN há erros THEN deve mostrar logs e sugestões de correção

### Requirement 10: Detecção Automática de Embeddings

**User Story:** Como sistema, quero detectar automaticamente se embeddings estão disponíveis, para que ofereça a melhor experiência possível.

#### Acceptance Criteria

1. WHEN usuário importa arquivo THEN deve verificar se embeddings existem
2. WHEN embeddings não existem THEN deve mostrar modal explicativo com opções
3. WHEN usuário é admin THEN deve oferecer gerar embeddings na hora
4. WHEN usuário não é admin THEN deve sugerir contatar administrador
5. WHEN embeddings são gerados THEN deve continuar importação automaticamente

### Requirement 11: Performance e Estabilidade

**User Story:** Como usuário, quero que o sistema mantenha boa performance, para que a experiência não seja prejudicada pela migração.

#### Acceptance Criteria

1. WHEN processo grandes volumes THEN deve manter performance atual ou melhor
2. WHEN há falhas na nova API THEN deve usar fallbacks sem interromper fluxo
3. WHEN há dados corrompidos THEN deve tratar graciosamente
4. WHEN há timeout na IA THEN deve continuar processamento com dados parciais
5. WHEN há erros de compatibilidade THEN deve logar e continuar funcionando