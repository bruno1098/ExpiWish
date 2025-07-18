// Utilitário para otimização de logs em produção
// Remove logs desnecessários que estão impactando a performance

import fs from 'fs';
import path from 'path';

// Configuração de logs que devem ser removidos
const LOG_PATTERNS = [
  // Logs básicos
  /console\.log\([^)]*\);?\s*$/gm,
  /console\.debug\([^)]*\);?\s*$/gm,
  /console\.info\([^)]*\);?\s*$/gm,
  
  // Logs condicionais simples
  /if \([^)]*\) console\.log\([^)]*\);?\s*$/gm,
  
  // Logs em loops que são muito custosos
  /console\.log\(`Match [^`]*`[^)]*\);?\s*$/gm,
  /console\.log\(`Adicionando [^`]*`[^)]*\);?\s*$/gm,
  /console\.log\(`Total [^`]*`[^)]*\);?\s*$/gm,
];

// Logs que devem ser mantidos (erros críticos)
const KEEP_PATTERNS = [
  /console\.error/,
  /console\.warn/,
  // Logs importantes de autenticação
  /console\.log.*Login/,
  /console\.log.*Auth/,
  // Logs de erro importantes
  /console\.log.*Erro/,
  /console\.log.*Error/,
];

// Função para verificar se um log deve ser mantido
function shouldKeepLog(line: string): boolean {
  return KEEP_PATTERNS.some(pattern => pattern.test(line));
}

// Função para limpar logs de um arquivo
export function cleanLogsFromFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  
  let cleanedContent = content;
  
  // Aplicar padrões de remoção
  for (const pattern of LOG_PATTERNS) {
    cleanedContent = cleanedContent.replace(pattern, (match) => {
      // Verificar se deve manter o log
      if (shouldKeepLog(match)) {
        return match;
      }
      
      // Remover o log mas manter quebras de linha para não afetar numeração
      return match.replace(/.*/, '');
    });
  }
  
  return cleanedContent;
}

// Função para processar múltiplos arquivos
export function cleanLogsFromDirectory(dirPath: string, extensions: string[] = ['.tsx', '.ts']): void {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory()) {
      // Recursivamente processar subdiretórios
      cleanLogsFromDirectory(fullPath, extensions);
    } else if (file.isFile() && extensions.some(ext => file.name.endsWith(ext))) {
      try {
        const originalContent = fs.readFileSync(fullPath, 'utf8');
        const cleanedContent = cleanLogsFromFile(fullPath);
        
        // Só escrever se houve mudanças
        if (originalContent !== cleanedContent) {
          fs.writeFileSync(fullPath, cleanedContent, 'utf8');
          console.log(`✅ Logs removidos de: ${fullPath}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${fullPath}:`, error);
      }
    }
  }
}

// Função específica para remover logs de performance críticos
export function removePerformanceLogs(content: string): string {
  // Remover logs em loops de filtro que são executados milhares de vezes
  const performanceKillers = [
    // Logs em filtros
    /if \(matchesHotel\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesSector\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesProblem\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesSource\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesKeyword\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesRating\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesLanguage\) console\.log\([^)]*\);?\s*$/gm,
    /if \(matchesSentiment\) console\.log\([^)]*\);?\s*$/gm,
    
    // Logs em processamento de dados
    /console\.log\(`Linha \d+.*`[^)]*\);?\s*$/gm,
    /console\.log\('=== PROCESSANDO.*'[^)]*\);?\s*$/gm,
    /console\.log\('✅ Data.*'[^)]*\);?\s*$/gm,
    /console\.log\('📅 Processando.*'[^)]*\);?\s*$/gm,
  ];
  
  let optimizedContent = content;
  
  for (const pattern of performanceKillers) {
    optimizedContent = optimizedContent.replace(pattern, '');
  }
  
  return optimizedContent;
}

// Substituir console.log por versão otimizada
export function replaceWithOptimizedLog(content: string): string {
  return content.replace(
    /console\.log\(/g,
    'optimizedLog('
  );
}

// Adicionar import do optimizedLog se necessário
export function addOptimizedLogImport(content: string): string {
  if (content.includes('optimizedLog(') && !content.includes('optimizedLog')) {
    // Encontrar linha de imports existentes
    const importMatch = content.match(/import.*from.*['"][^'"]*['"];?\s*$/m);
    
    if (importMatch) {
      const importLine = "import { optimizedLog } from '@/lib/performance-optimization';\n";
      return content.replace(importMatch[0], importMatch[0] + '\n' + importLine);
    }
  }
  
  return content;
}

// Função principal para otimizar um arquivo completo
export function optimizeFilePerformance(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Remover logs de performance críticos
    content = removePerformanceLogs(content);
    
    // 2. Substituir console.log restantes por optimizedLog
    content = replaceWithOptimizedLog(content);
    
    // 3. Adicionar import se necessário
    content = addOptimizedLogImport(content);
    
    // Escrever arquivo otimizado
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`🚀 Performance otimizada em: ${filePath}`);
  } catch (error) {
    console.error(`❌ Erro ao otimizar ${filePath}:`, error);
  }
}

// Função para otimizar todos os arquivos críticos
export function optimizeAllPerformanceCriticalFiles(): void {
  const criticalFiles = [
    'app/page.tsx',
    'app/dashboard/page.tsx', 
    'app/admin/page.tsx',
    'app/analysis/page.tsx',
    'app/analysis/unidentified/page.tsx',
    'app/import/ImportPageContent.tsx',
    'lib/feedback.ts',
    'lib/firestore-service.ts',
    'lib/auth-context.tsx'
  ];
  
  console.log('🚀 Iniciando otimização de performance...');
  
  for (const file of criticalFiles) {
    optimizeFilePerformance(file);
  }
  
  console.log('✅ Otimização de performance concluída!');
}

// Estatísticas de otimização
export function generateOptimizationReport(beforeContent: string, afterContent: string) {
  const beforeLogs = (beforeContent.match(/console\.log/g) || []).length;
  const afterLogs = (afterContent.match(/console\.log/g) || []).length;
  const removedLogs = beforeLogs - afterLogs;
  
  return {
    logsRemoved: removedLogs,
    logsBefore: beforeLogs,
    logsAfter: afterLogs,
    reductionPercentage: beforeLogs > 0 ? Math.round((removedLogs / beforeLogs) * 100) : 0
  };
} 