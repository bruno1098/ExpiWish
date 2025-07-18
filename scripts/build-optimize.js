#!/usr/bin/env node

/**
 * Script de Otimização SIMPLES para Build de Produção
 * Remove apenas console.log desnecessários em produção
 * Mantém console.error e console.warn
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando otimização SIMPLES de build para produção...');

// Função para processar um arquivo
function optimizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Remover console.log, console.debug, console.info (mantém console.error e console.warn)
    const originalContent = content;
    
    // Remover console.log
    content = content.replace(/console\.log\([^)]*\);?\s*$/gm, '');
    
    // Remover console.debug
    content = content.replace(/console\.debug\([^)]*\);?\s*$/gm, '');
    
    // Remover console.info
    content = content.replace(/console\.info\([^)]*\);?\s*$/gm, '');
    
    // Remover linhas vazias extras criadas
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Verificar se houve mudanças
    if (originalContent !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Otimizado: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`   ❌ Erro ao otimizar ${filePath}:`, error.message);
    return false;
  }
}

// Função para encontrar arquivos recursivamente
function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      
      if (item.isDirectory()) {
        // Pular node_modules e .next
        if (!['node_modules', '.next', '.git'].includes(item.name)) {
          scanDir(fullPath);
        }
      } else if (item.isFile()) {
        if (extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDir(dir);
  return files;
}

// Função principal
function main() {
  const startTime = Date.now();
  
  // Verificar se estamos em produção
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Otimização de build ativa apenas em produção');
    console.log('💡 Para testar localmente: NODE_ENV=production node scripts/build-optimize.js');
    return;
  }

  console.log('🔧 Otimizando arquivos para produção (método SIMPLES)...');
  
  const projectRoot = process.cwd();
  const dirsToOptimize = ['app', 'lib', 'components'];
  
  let totalFiles = 0;
  let optimizedFiles = 0;

  // Processar cada diretório
  for (const dir of dirsToOptimize) {
    const dirPath = path.join(projectRoot, dir);
    
    if (fs.existsSync(dirPath)) {
      console.log(`📁 Processando ${dir}/...`);
      
      const files = findFiles(dirPath);
      totalFiles += files.length;
      
      for (const file of files) {
        if (optimizeFile(file)) {
          optimizedFiles++;
        }
      }
    }
  }

  const duration = Date.now() - startTime;
  
  console.log('\n📊 RELATÓRIO DE OTIMIZAÇÃO SIMPLES:');
  console.log('====================================');
  console.log(`📁 Arquivos analisados: ${totalFiles}`);
  console.log(`✅ Arquivos otimizados: ${optimizedFiles}`);
  console.log(`⏱️  Tempo de execução: ${duration}ms`);
  console.log(`🚀 Logs removidos: console.log, console.debug, console.info`);
  console.log(`✅ Logs mantidos: console.error, console.warn`);
  
  console.log('\n🎯 RESULTADO:');
  console.log('=============');
  console.log('✅ Estrutura de arquivos preservada');
  console.log('✅ Imports não modificados');
  console.log('✅ Apenas logs desnecessários removidos');
  console.log('✅ Build mais limpo e rápido');
  
  console.log('\n🚀 Build de produção otimizado com sucesso!');
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { optimizeFile, findFiles, main }; 