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
const {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  deleteField,
  collection,
  getDocs,
  deleteDoc
} = require('firebase/firestore');

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

const args = process.argv.slice(2);
const SHOULD_RESET_EMBEDDINGS = args.includes('--reset-embeddings');

if (ALL_PROBLEMS.length === 0) {
  console.error('❌ Nenhum problem extraído do código. Verifique o arquivo fonte e o formato do dicionário.');
  process.exit(1);
}

function normalizeListItems(items = []) {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return item.label || item.id || JSON.stringify(item);
      }
      return '';
    })
    .filter(Boolean)
    .sort();
}

function extractKeywords(rawKeywords) {
  if (!rawKeywords) return [];
  if (Array.isArray(rawKeywords)) {
    return normalizeListItems(rawKeywords);
  }
  if (typeof rawKeywords === 'object') {
    const flattened = Object.values(rawKeywords)
      .flat()
      .map((kw) => (typeof kw === 'string' ? kw : kw?.label || ''));
    return normalizeListItems(flattened);
  }
  return [];
}

function generateHash(items = []) {
  const normalized = normalizeListItems(items);
  const joined = normalized.join('|');
  let hash = 0;
  for (let i = 0; i < joined.length; i++) {
    hash = ((hash << 5) - hash) + joined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function calculateTaxonomyVersion(taxonomy) {
  const keywordsHash = generateHash(taxonomy.keywords);
  const problemsHash = generateHash(taxonomy.problems);
  const departmentsHash = generateHash(taxonomy.departments);

  const combinedHash = `${keywordsHash}-${problemsHash}-${departmentsHash}`;
  let version = 0;
  for (let i = 0; i < combinedHash.length; i++) {
    version = ((version << 5) - version) + combinedHash.charCodeAt(i);
    version |= 0;
  }

  return {
    version: Math.abs(version),
    last_updated: new Date(),
    keywords_count: taxonomy.keywords.length,
    problems_count: taxonomy.problems.length,
    departments_count: taxonomy.departments.length,
    keywords_hash: keywordsHash,
    problems_hash: problemsHash,
    departments_hash: departmentsHash,
    embeddings_outdated: true
  };
}

async function clearEmbeddingChunks() {
  const chunksRef = collection(db, 'dynamic-lists', 'global-lists', 'embeddings');
  const snapshot = await getDocs(chunksRef);

  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;
  for (const chunk of snapshot.docs) {
    await deleteDoc(chunk.ref);
    deleted++;
  }
  return deleted;
}

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

    const normalizedKeywords = extractKeywords(currentData.keywords);
    const normalizedDepartments = normalizeListItems(currentData.departments || []);
    const taxonomyVersion = calculateTaxonomyVersion({
      keywords: normalizedKeywords,
      problems: ALL_PROBLEMS,
      departments: normalizedDepartments
    });

    // 3. Atualizar no Firebase
    console.log('\n💾 Atualizando Firebase...');
    
    const updatePayload = {
      problems: ALL_PROBLEMS,
      problems_updated_at: new Date(),
      problems_synced_from: 'app/api/generate-embeddings/route.ts',
      total_problems: ALL_PROBLEMS.length,
      taxonomy_version_info: taxonomyVersion,
      taxonomy_version: taxonomyVersion.version,
      last_taxonomy_update: new Date()
    };

    if (SHOULD_RESET_EMBEDDINGS) {
      Object.assign(updatePayload, {
        embeddings_taxonomy_version: null,
        embeddings_updated_at: null,
        embeddings_outdated_reason: 'problems_list_changed',
        problems_with_embeddings: deleteField()
      });
    }

    await updateDoc(docRef, updatePayload);

    console.log('   ✅ Firebase atualizado com sucesso!');

    if (SHOULD_RESET_EMBEDDINGS) {
      console.log('\n🧹 Limpando chunks antigos de embeddings...');
      const deletedChunks = await clearEmbeddingChunks();
      console.log(`   ✅ ${deletedChunks} chunks removidos (se existiam)`);
    } else {
      console.log('\nℹ️ Chunks de embeddings preservados (use --reset-embeddings para limpar).');
    }

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
