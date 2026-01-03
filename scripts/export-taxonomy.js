#!/usr/bin/env node

// Exporta todas as keywords e problems atuais do Firebase em formato JSON
// Uso:
//   node scripts/export-taxonomy.js [output-file] [--pretty] [--include-raw]
//     output-file   Caminho opcional para salvar o JSON (default: stdout)
//     --pretty      Formata o JSON com indentação de 2 espaços
//     --include-raw Inclui objetos completos retornados do Firebase (chunked)

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBoCA8htD7kcfCMfephG6O1oKlrG2hbGzU",
  authDomain: "expi-e7219.firebaseapp.com",
  databaseURL: "https://expi-e7219-default-rtdb.firebaseio.com",
  projectId: "expi-e7219",
  storageBucket: "expi-e7219.firebasestorage.app",
  messagingSenderId: "873889751904",
  appId: "1:873889751904:web:041d5ea449384087727405"
};

initializeApp(firebaseConfig);
const db = getFirestore();

const args = process.argv.slice(2);
const outputArg = args.find((arg) => !arg.startsWith('--')) || null;
const outputPath = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : null;
const pretty = args.includes('--pretty');
const includeRaw = args.includes('--include-raw');

function normalizeLabel(entry) {
  if (typeof entry === 'string') {
    return entry.trim();
  }
  if (entry && typeof entry === 'object') {
    const label = entry.label || entry.name || entry.title || entry.id || '';
    return label.trim();
  }
  return '';
}

function uniqueStrings(items) {
  const set = new Set();
  items.forEach((item) => {
    const normalized = normalizeLabel(item);
    if (normalized) {
      set.add(normalized);
    }
  });
  return Array.from(set);
}

async function loadChunkItems(type, totalChunks) {
  if (!totalChunks || totalChunks <= 0) {
    return [];
  }

  const items = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkId = `${type}_chunk_${i}`;
    const chunkRef = doc(db, 'dynamic-lists', 'global-lists', 'embeddings', chunkId);
    const chunkSnap = await getDoc(chunkRef);

    if (chunkSnap.exists()) {
      const chunkData = chunkSnap.data();
      const chunkItems = chunkData[type];
      if (Array.isArray(chunkItems)) {
        items.push(...chunkItems);
      }
    }
  }
  return items;
}

function flattenMapValues(mapObj = {}) {
  return Object.values(mapObj)
    .flat()
    .filter(Boolean);
}

async function collectKeywords(data) {
  if (data.embeddings_structure === 'chunked' && data.batch_generation_stats?.keyword_chunks) {
    const chunked = await loadChunkItems('keywords', data.batch_generation_stats.keyword_chunks);
    return { raw: chunked, labels: uniqueStrings(chunked) };
  }

  if (Array.isArray(data.keywords_with_embeddings) && data.keywords_with_embeddings.length > 0) {
    return { raw: data.keywords_with_embeddings, labels: uniqueStrings(data.keywords_with_embeddings) };
  }

  if (typeof data.keywords === 'object' && !Array.isArray(data.keywords)) {
    const flattened = flattenMapValues(data.keywords);
    return { raw: flattened, labels: uniqueStrings(flattened) };
  }

  if (Array.isArray(data.keywords)) {
    return { raw: data.keywords, labels: uniqueStrings(data.keywords) };
  }

  return { raw: [], labels: [] };
}

async function collectProblems(data) {
  if (data.embeddings_structure === 'chunked' && data.batch_generation_stats?.problem_chunks) {
    const chunked = await loadChunkItems('problems', data.batch_generation_stats.problem_chunks);
    return { raw: chunked, labels: uniqueStrings(chunked) };
  }

  if (Array.isArray(data.problems_with_embeddings) && data.problems_with_embeddings.length > 0) {
    return { raw: data.problems_with_embeddings, labels: uniqueStrings(data.problems_with_embeddings) };
  }

  if (Array.isArray(data.problems)) {
    return { raw: data.problems, labels: uniqueStrings(data.problems) };
  }

  return { raw: [], labels: [] };
}

async function main() {
  console.log('🔄 Buscando taxonomia em dynamic-lists/global-lists...');
  const docRef = doc(db, 'dynamic-lists', 'global-lists');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.error('❌ Documento dynamic-lists/global-lists não encontrado.');
    process.exit(1);
  }

  const data = docSnap.data();
  const [keywordsData, problemsData] = await Promise.all([
    collectKeywords(data),
    collectProblems(data)
  ]);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'dynamic-lists/global-lists',
    counts: {
      keywords: keywordsData.labels.length,
      problems: problemsData.labels.length
    },
    keywords: keywordsData.labels.sort(),
    problems: problemsData.labels.sort()
  };

  if (includeRaw) {
    output.raw = {
      keywords: keywordsData.raw,
      problems: problemsData.raw
    };
  }

  const json = JSON.stringify(output, null, pretty ? 2 : 0);

  if (outputPath) {
    fs.writeFileSync(outputPath, json, 'utf8');
    console.log(`✅ Taxonomia exportada para ${outputPath}`);
  } else {
    console.log(json);
  }
}

main().catch((error) => {
  console.error('❌ Erro ao exportar taxonomia:', error);
  process.exit(1);
});
