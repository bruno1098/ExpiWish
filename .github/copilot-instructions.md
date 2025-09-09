# ExpiWish - Sistema de Análise de Feedbacks para Hotéis

## Arquitetura Principal

Este é um sistema Next.js 13+ com App Router que analisa feedbacks de hotéis usando IA para classificação automática e geração de insights estratégicos para redes hoteleiras.

### Stack Central
- **Frontend**: Next.js 13.5 + TypeScript + Tailwind CSS + Radix UI
- **Backend**: Next.js API Routes serverless + Firebase (Auth, Firestore)
- **IA**: OpenAI GPT-4 Mini para análise de sentimentos e categorização
- **Charts**: Chart.js + Recharts para visualizações
- **Forms**: React Hook Form + Zod para validação

## Estrutura de Pastas

```
/
├── app/                          # Next.js 13+ App Router
│   ├── (dashboard)/             # Grupo de rotas com sidebar (staff)
│   │   └── layout.tsx
│   ├── admin/                   # Área administrativa (RequireAdmin)
│   │   ├── analytics/          # Analytics avançados
│   │   ├── comparacao/         # Comparação entre hotéis
│   │   ├── configuracao/       # Configurações administrativas
│   │   ├── feedback-nao-identifi.../ # Feedbacks não identificados
│   │   ├── logs/               # Logs do sistema
│   │   ├── perfis/             # Perfis de usuários
│   │   ├── usuarios/           # Gerenciamento de usuários
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── ambiente-teste/          # Ambiente de testes isolado
│   ├── analysis/                # Páginas de análise detalhada
│   │   ├── unidentified/       # Análises não identificadas
│   │   └── page.tsx
│   ├── api/                     # API Routes serverless
│   │   ├── admin/              # APIs administrativas
│   │   │   └── delete-user/    # Exclusão de usuários
│   │   ├── analyze-feedback/   # Análise de IA (rota crítica)
│   │   ├── delete-analysis/    # Exclusão de análises
│   │   ├── delete-feedback/    # Exclusão de feedbacks
│   │   ├── hotels/             # Gestão de hotéis
│   │   ├── logout/             # Logout com limpeza
│   │   │   └── route.ts
│   │   ├── restore-feedback/   # Restauração de feedbacks
│   │   ├── setup/              # Configuração inicial
│   │   ├── sync-hotels/        # Sincronização de hotéis
│   │   └── test-environment/   # APIs de teste
│   ├── auth/                    # Autenticação
│   ├── components/              # Componentes específicos de páginas
│   ├── dashboard/               # Dashboard principal (staff)
│   ├── history/                 # Histórico de análises
│   ├── import/                  # Importação de dados CSV/XLSX
│   ├── settings/                # Configurações do usuário
│   ├── setup/                   # Configuração inicial do sistema
│   ├── layout.tsx               # Root layout com AuthProvider
│   ├── page.tsx                 # Redirecionamento automático
│   ├── globals.css              # Estilos globais + Tailwind
│   ├── dark-theme.css           # Estilos específicos tema escuro
│   └── shared-layout.tsx        # Layout compartilhado
├── components/                   # Componentes reutilizáveis
│   ├── ui/                      # shadcn/ui + Radix primitives
│   ├── modern-charts.tsx        # Charts padronizados Chart.js
│   ├── sidebar.tsx              # Sidebar responsiva
│   ├── header.tsx               # Header com theme toggle
│   ├── maintenance-page.tsx     # Página de manutenção
│   ├── theme-provider.tsx       # Provider de tema
│   └── [outros-components].tsx  # Modais, viewers, editores, etc.
├── contexts/                     # Contexts React específicos
├── hooks/                        # Custom hooks
├── lib/                          # Utilitários e serviços
│   ├── contexts/                # Contexts auxiliares
│   ├── firebase.ts              # Configuração Firebase
│   ├── auth-context.tsx         # Context de autenticação
│   ├── auth-service.ts          # Serviços de autenticação
│   ├── firestore-service.ts     # Operações Firestore
│   ├── openai-client.ts         # Cliente OpenAI
│   ├── server-auth.ts           # Auth middleware para API
│   ├── analytics-service.ts     # Serviços de analytics
│   ├── performance-config.ts    # Configurações de performance
│   ├── maintenance-config.ts    # Sistema de manutenção
│   ├── dev-logger.ts            # Logger para desenvolvimento
│   └── utils.ts                 # Utilitários gerais
├── public/                       # Assets estáticos (logos, imagens)
├── scripts/                      # Scripts de automação
│   ├── build-optimize.js        # Otimização de build
│   ├── add-test-hotel.ts        # Dados de teste
│   └── test-access-tracking.ts  # Tracking de acessos
├── types/                        # Definições TypeScript
└── zz/                          # Arquivos temporários/backup
```

### Estrutura de Autenticação
- **Auth Provider**: `lib/auth-context.tsx` - contexto global com verificação de roles
- **Middleware**: `lib/server-auth.ts` - autenticação server-side para API routes
- **Proteção de rotas**: `RequireAuth` e `RequireAdmin` components para controle de acesso
- **Roles**: `admin` (acesso total) vs `staff` (acesso limitado ao próprio hotel)

## Fluxos Críticos de Desenvolvimento

### Sistema de IA para Análise de Feedbacks

**Fluxo Principal**: `app/api/analyze-feedback/route.ts`
```typescript
// Entrada: { texto: string, comment?: string }
// Saída: classificação estruturada completa
```

**Como a IA Funciona:**
1. **Pré-processamento**: Normalização e validação do texto
2. **Cache Check**: Verifica cache em memória (30min) para evitar reprocessamento
3. **Prompt Engineering**: Usa prompt estruturado com exemplos específicos
4. **Function Calling**: OpenAI GPT-4 Mini com structured outputs
5. **Pós-processamento**: Validação e normalização das respostas

**Classificação Estruturada:**
- **Sentimento**: 1-5 (Muito insatisfeito → Muito satisfeito)
- **Departamento**: A&B, Governança, Manutenção, Lazer, TI, Operações, etc.
- **Palavra-chave**: Específica (ex: "A&B - Café da manhã", "Tecnologia - Wi-fi")
- **Problema**: Padronizado (ex: "Demora no Atendimento", "Falta de Limpeza")
- **Detalhes**: Descrição objetiva do problema específico
- **Sugestões**: Detecção automática de sugestões de melhoria

**Dicionário de Normalização**: `RAW_NORMALIZATION_DICT`
- Mapeia termos comuns para palavras-chave padronizadas
- Ex: "wifi" → "Tecnologia - Wi-fi", "café da manhã" → "A&B - Café da manhã"

**Rate Limiting e Performance:**
```typescript
MAX_REQUESTS_PER_MINUTE: 180
CACHE_EXPIRY: 30 * 60 * 1000  // 30 minutos
```

### Importação de Dados
- **Localização**: `app/import/ImportPageContent.tsx`
- **Suporte**: CSV/XLSX via `react-dropzone` + `papaparse`/`xlsx`
- **Processamento**: Chunks de 100 itens (`PERFORMANCE_CONFIG`)
- **Pipeline**: Upload → Parse → Análise IA → Firestore
- **Validação**: Detecção automática de colunas e formato

### Sistema de Cache e Performance
```typescript
// Cache de análises para dashboards administrativos
analysesCache: any = null
CACHE_DURATION = 30000  // 30 segundos

// Carregamento paralelo otimizado
const [hotelsSnapshot, analyses] = await Promise.all([
  getDocs(collection(db, "hotels")),
  getAllAnalyses()
]);
```

## Convenções e Padrões

### Estrutura de Components
- **Shared Layout**: `app/shared-layout.tsx` para layout comum entre dashboard/admin
- **Modern Charts**: `components/modern-charts.tsx` - componentes Chart.js padronizados
- **UI Components**: baseados em shadcn/ui com Radix UI primitives

### Roteamento Next.js 13+
```
app/
├── (dashboard)/          # Grupo de rotas com sidebar
├── admin/               # Área administrativa (RequireAdmin)
├── auth/                # Autenticação (layout próprio)
├── api/                 # API routes serverless
└── shared-layout.tsx    # Layout compartilhado
```

## Firebase - Arquitetura de Dados

### Configuração (`lib/firebase.ts`)
```typescript
// Serviços utilizados
const db: Firestore = getFirestore(app);           // Dados principais
const auth: Auth = getAuth(app);                   // Autenticação
const realtimeDb: Database = getDatabase(app);     // Funcionalidades específicas
```

### Collections do Firestore

**Collection: `users`**
```typescript
interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  hotelId: string;        // Filtro para staff
  hotelName: string;
  mustChangePassword?: boolean;
  emailVerified: boolean;
  firstAccessAt?: Timestamp;
  lastAccessAt?: Timestamp;
}
```

**Collection: `hotels`**
```typescript
interface Hotel {
  id: string;
  name: string;
  active: boolean;
  createdAt: Timestamp;
}
```

**Collection: `analyses`**
```typescript
interface Analysis {
  id: string;
  hotelId: string;
  createdAt: Timestamp;
  data: Feedback[];      // Array de feedbacks processados
  analysis: {            // Dados agregados pré-calculados
    totalFeedbacks: number;
    averageRating: number;
    positiveSentiment: number;
    sectorDistribution: Array<{sector: string, count: number}>;
    keywordDistribution: Array<{keyword: string, count: number}>;
    problemDistribution: Array<{problem: string, count: number}>;
    ratingDistribution: Record<string, number>;
    recentFeedbacks: Feedback[];
  };
}
```

### Serviços Firebase (`lib/firestore-service.ts` e `lib/auth-service.ts`)

**Autenticação:**
- `loginUser()` - Login com email/senha
- `getCurrentUserData()` - Dados do usuário logado
- `canUserAccess()` - Verificação de acesso (email verificado)
- `updateUserLastAccess()` - Tracking de acessos

**Firestore Operations:**
- `saveAnalysis()` - Salvar análise completa
- `getAllAnalyses()` - Buscar todas as análises (admin)
- `getLatestAnalysisFromFirestore()` - Última análise do hotel (staff)
- Cache inteligente para queries pesadas (admins)

### Estrutura de Queries Otimizadas
```typescript
// Admin: todos os hotéis
const analysesRef = collection(db, 'analyses');
const analysesSnapshot = await getDocs(analysesRef);

// Staff: apenas seu hotel
const q = query(
  collection(db, 'analyses'),
  where('hotelId', '==', userData.hotelId)
);
```

### Sistema de Manutenção
```typescript
// lib/maintenance-config.ts
MAINTENANCE_MODE: boolean
```
- Intercepta todas as rotas no layout principal
- Página de manutenção com design consistente da marca
- Suporte a whitelist por email/IP

## Comandos de Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build com otimização automática
npm run build  # executa scripts/build-optimize.js automaticamente

# Build sem otimizações (debug)
npm run build:dev

# Otimizar manualmente
npm run optimize
```

### Script de Build Optimization
- Remove `console.log/debug/info` em produção (mantém `console.error/warn`)
- Executa automaticamente no `prebuild`
- Preserva estrutura de arquivos e imports

## Integrações e APIs

### OpenAI Integration (`lib/openai-client.ts`)

**Modelo Utilizado**: `gpt-4o-mini`
- Otimizado para análise de texto em larga escala
- Custo-benefício para processamento de feedback
- Latência reduzida comparado ao GPT-4 completo

**Function Calling Estruturado:**
```typescript
const classifyFunction = {
  name: "classify_feedback",
  description: "Classifica feedback em sentimento, problemas e sugestões",
  parameters: {
    type: "object",
    properties: {
      sentiment: { type: "integer", enum: [1,2,3,4,5] },
      has_suggestion: { type: "boolean" },
      suggestion_type: { 
        type: "string", 
        enum: ["none", "only_suggestion", "with_criticism", "with_praise", "mixed"]
      },
      issues: {
        type: "array",
        maxItems: 3,
        items: {
          keyword: { enum: OFFICIAL_KEYWORDS },
          department: { enum: OFFICIAL_DEPARTMENTS },
          problem: { enum: STANDARD_PROBLEMS },
          problem_detail: { type: "string", maxLength: 120 }
        }
      }
    }
  }
};
```

**Prompt Engineering:**
- Exemplos específicos para cada tipo de classificação
- Mapeamento departamento → palavra-chave obrigatório
- Detecção de sugestões com padrões linguísticos
- Normalização automática de termos comuns

**Tratamento de Erros:**
- Rate limiting específico (429 errors)
- Retry automático com backoff exponencial
- Fallback para responses malformadas
- Cache para evitar reprocessamento

### Firebase Services

**Authentication (`lib/auth-service.ts`):**
- Verificação obrigatória de email
- Sistema de senhas temporárias
- Tracking de primeiro/último acesso
- Controle de roles (admin/staff)

**Firestore (`lib/firestore-service.ts`):**
- Queries otimizadas com índices compostos
- Batch operations para importação em massa
- Cache em memória para dashboards administrativos
- Paginação automática para grandes datasets

**Security Rules:**
```javascript
// users: apenas próprio documento
allow read, write: if request.auth != null && request.auth.uid == resource.id;

// analyses: staff vê apenas seu hotel, admin vê tudo
allow read: if request.auth != null && 
  (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
   resource.data.hotelId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.hotelId);
```

### Rate Limiting e Performance
```typescript
// performance-config.ts
CHUNK_SIZE: 100
CONCURRENT_REQUESTS: 5
MAX_REQUESTS_PER_MINUTE: 180
```

## Padrões de UI/UX

### Design System
- Cores da marca: gradientes azul/roxo/rosa
- Theme toggle: light/dark com persistência
- Sidebar responsiva com animações suaves
- Loading states e feedback visual consistente

### Data Visualization
- Charts interativos com drill-down
- Modais detalhados para análise profunda
- Filtros avançados por data, hotel, rating
- Export de dados e relatórios

### Responsividade
- Mobile-first com sidebar como overlay
- Breakpoints consistentes com Tailwind
- Touch-friendly para tablets

## Comandos de Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build com otimização automática
npm run build  # executa scripts/build-optimize.js automaticamente

# Build sem otimizações (debug)
npm run build:dev

# Otimizar manualmente
npm run optimize
```

### Script de Build Optimization
- Remove `console.log/debug/info` em produção (mantém `console.error/warn`)
- Executa automaticamente no `prebuild`
- Preserva estrutura de arquivos e imports


