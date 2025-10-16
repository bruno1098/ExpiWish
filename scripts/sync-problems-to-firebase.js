/**
 * Script para sincronizar Problems do código para o Firebase
 * 
 * Este script:
 * 1. Extrai todos os problems do PROBLEM_CONTEXT_DICT
 * 2. Atualiza o campo "problems" em /dynamic-lists/global-lists no Firebase
 * 3. Mantém a ordem exata do código
 * 
 * ATENÇÃO: Este script SOBRESCREVE os problems no Firebase!
 * 
 * USO: node scripts/sync-problems-to-firebase.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBoCA8htD7kcfCMfephG6O1oKlrG2hbGzU",
  authDomain: "expi-e7219.firebaseapp.com",
  databaseURL: "https://expi-e7219-default-rtdb.firebaseio.com",
  projectId: "expi-e7219",
  storageBucket: "expi-e7219.firebasestorage.app",
  messagingSenderId: "873889751904",
  appId: "1:873889751904:web:041d5ea449384087727405"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Extração dinâmica dos problems diretamente do código fonte
 * Lê app/api/generate-embeddings/route.ts e coleta as chaves de
 * PROBLEM_CONTEXT_DICT e ADDITIONAL_PROBLEMS_EG_CORPORATIVO mantendo a ordem.
 */
const fs = require('fs');
const path = require('path');

function extractDictKeys(source, dictVarName) {
  const start = source.indexOf(`const ${dictVarName}`);
  if (start === -1) return [];
  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return [];
  let i = braceStart;
  let depth = 0;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  const block = source.slice(braceStart + 1, i);
  const keys = [];
  const keyRegex = /^[ \t]*"([^"]+)"\s*:/gm;
  let m;
  while ((m = keyRegex.exec(block)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

const sourcePath = path.join(__dirname, '..', 'app', 'api', 'generate-embeddings', 'route.ts');
const sourceCode = fs.readFileSync(sourcePath, 'utf8');

const baseKeys = extractDictKeys(sourceCode, 'PROBLEM_CONTEXT_DICT');
const additionalKeys = extractDictKeys(sourceCode, 'ADDITIONAL_PROBLEMS_EG_CORPORATIVO');

const ALL_PROBLEMS = [...baseKeys, ...additionalKeys];

if (ALL_PROBLEMS.length === 0) {
  console.error('❌ Nenhum problem extraído do código. Verifique o arquivo fonte e o formato do dicionário.');
  process.exit(1);
}

/**
 * Função principal
 */
async function syncProblemsToFirebase() {
  try {
    console.log('🚀 Iniciando sincronização de problems para o Firebase...\n');

    const docRef = doc(db, 'dynamic-lists', 'global-lists');

    // 1. Verificar documento atual
    console.log('📋 Buscando documento atual...');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error('❌ Documento não encontrado em /dynamic-lists/global-lists');
      process.exit(1);
    }

    const currentData = docSnap.data();
    const currentProblems = currentData.problems || [];

    console.log(`   ✅ Documento encontrado`);
    console.log(`   📊 Problems atuais no Firebase: ${currentProblems.length}`);
    console.log(`   📊 Problems no código (extraídos do PROBLEM_CONTEXT_DICT): ${ALL_PROBLEMS.length}\n`);

    // 2. Mostrar diferenças
    console.log('🔍 Analisando diferenças...');
    
    const problemsNoFirebaseNaoNoCodigo = currentProblems.filter(p => !ALL_PROBLEMS.includes(p));
    const problemsNoCdigoNaoNoFirebase = ALL_PROBLEMS.filter(p => !currentProblems.includes(p));

    if (problemsNoFirebaseNaoNoCodigo.length > 0) {
      console.log(`\n⚠️  Problems no Firebase que NÃO estão no código (${problemsNoFirebaseNaoNoCodigo.length}):`);
      problemsNoFirebaseNaoNoCodigo.forEach(p => console.log(`   - ${p}`));
    }

    if (problemsNoCdigoNaoNoFirebase.length > 0) {
      console.log(`\n✨ Problems no código que NÃO estão no Firebase (${problemsNoCdigoNaoNoFirebase.length}):`);
      problemsNoCdigoNaoNoFirebase.forEach(p => console.log(`   - ${p}`));
    }

    if (problemsNoFirebaseNaoNoCodigo.length === 0 && problemsNoCdigoNaoNoFirebase.length === 0) {
      console.log('   ✅ Nenhuma diferença encontrada! Firebase e código estão sincronizados.');
      console.log('\n✨ Sincronização concluída com sucesso!\n');
      process.exit(0);
    }

    // 3. Atualizar no Firebase
    console.log('\n💾 Atualizando Firebase...');
    
    await updateDoc(docRef, {
      problems: ALL_PROBLEMS,
      problems_updated_at: new Date(),
      problems_synced_from: 'generate-embeddings/route.ts PROBLEM_CONTEXT_DICT',
      total_problems: ALL_PROBLEMS.length
    });

    console.log('   ✅ Firebase atualizado com sucesso!');

    // 4. Validar atualização
    console.log('\n🔍 Validando atualização...');
    const updatedDocSnap = await getDoc(docRef);
    const updatedData = updatedDocSnap.data();
    const updatedProblems = updatedData.problems || [];

    console.log(`   ✅ Problems no Firebase após atualização: ${updatedProblems.length}`);

    // 5. Resumo por departamento
    console.log('\n📊 Resumo por departamento:');
    const departamentos = {
      'A&B': 0,
      'Corporativo': 0,
      'EG': 0,
      'Governança': 0,
      'Lazer': 0,
      'Manutenção': 0,
      'Operações': 0,
      'Produto': 0,
      'TI': 0
    };
    
    console.log('   📝 Nota: Transfer movido de Operações → Produto (relacionado à keyword "Produto - Transfer")');

    ALL_PROBLEMS.forEach(problem => {
      const dept = problem.split(' - ')[0];
      if (departamentos[dept] !== undefined) {
        departamentos[dept]++;
      }
    });

    Object.entries(departamentos).forEach(([dept, count]) => {
      console.log(`   ${dept.padEnd(15)} ${count} problems`);
    });

    console.log(`\n   ${'TOTAL'.padEnd(15)} ${ALL_PROBLEMS.length} problems`);

    console.log('\n✨ Sincronização concluída com sucesso!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error);
    process.exit(1);
  }
}

// Executar script
syncProblemsToFirebase();
