/**
 * 📊 TESTE DE PERFORMANCE ESPECÍFICO - Página de Análise
 * 
 * Este teste é focado especificamente nas ações que causam travamento:
 * - Edição de comentários
 * - Alteração de ratings
 * - Filtros de feedback
 * - Salvamento de alterações
 */

class AnalysisPageTester {
  constructor() {
    this.metrics = {
      renderTimes: [],
      memorySnapshots: [],
      interactionLatencies: [],
      errorCount: 0,
      timeoutLeaks: 0
    };
    
    this.startTime = performance.now();
    this.baselineMemory = this.getMemoryUsage();
  }

  async runCompleteTest() {
    console.log('🎯 TESTE ESPECÍFICO - PÁGINA DE ANÁLISE');
    console.log('══════════════════════════════════════');
    console.log('🎪 Testando ações que causam travamento do Chrome...');
    console.log('');

    try {
      // 1. Teste de edição intensiva de comentários
      await this.testCommentEditing();
      
      // 2. Teste de mudanças de rating em massa  
      await this.testRatingChanges();
      
      // 3. Teste de filtros e busca
      await this.testFiltering();
      
      // 4. Teste de salvamento em lote
      await this.testBatchSaving();
      
      // 5. Teste de scroll e lazy loading
      await this.testScrollPerformance();
      
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Erro durante o teste:', error);
      this.metrics.errorCount++;
    }
  }

  async testCommentEditing() {
    console.log('📝 Testando edição intensiva de comentários...');
    
    // Encontrar todos os campos de comentário
    const commentFields = this.findCommentFields();
    console.log(`   Encontrados ${commentFields.length} campos de comentário`);
    
    if (commentFields.length === 0) {
      console.warn('   ⚠️ Nenhum campo de comentário encontrado');
      return;
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Simular edição rápida e intensiva
    for (let i = 0; i < Math.min(commentFields.length, 20); i++) {
      const field = commentFields[i];
      
      try {
        // Focar no campo
        field.focus();
        await this.wait(50);
        
        // Simular digitação rápida (isso costuma causar o travamento)
        await this.simulateFastTyping(field);
        
        // Simular perda de foco (trigger de salvamento automático)
        field.blur();
        await this.wait(100);
        
        // Medir performance a cada 5 edições
        if (i % 5 === 0) {
          this.captureMetrics(`comment_edit_${i}`);
        }
        
      } catch (error) {
        console.warn(`   ⚠️ Erro editando campo ${i}:`, error.message);
        this.metrics.errorCount++;
      }
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    console.log(`   ✅ Edição concluída em ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`   📊 Memória: ${startMemory}MB → ${endMemory}MB (${(endMemory - startMemory).toFixed(2)}MB)`);
    
    if (endMemory - startMemory > 50) {
      console.warn(`   🚨 VAZAMENTO DETECTADO: +${(endMemory - startMemory).toFixed(2)}MB`);
    }
  }

  async testRatingChanges() {
    console.log('⭐ Testando mudanças de rating em massa...');
    
    const ratingControls = this.findRatingControls();
    console.log(`   Encontrados ${ratingControls.length} controles de rating`);
    
    if (ratingControls.length === 0) return;

    const startMemory = this.getMemoryUsage();

    for (let i = 0; i < Math.min(ratingControls.length, 15); i++) {
      try {
        const control = ratingControls[i];
        
        // Simular mudança de rating (1 a 5)
        const newRating = (i % 5) + 1;
        await this.changeRating(control, newRating);
        await this.wait(200);
        
        if (i % 5 === 0) {
          this.captureMetrics(`rating_change_${i}`);
        }
        
      } catch (error) {
        console.warn(`   ⚠️ Erro mudando rating ${i}:`, error.message);
        this.metrics.errorCount++;
      }
    }

    const endMemory = this.getMemoryUsage();
    console.log(`   ✅ Ratings alterados - Memória: ${startMemory}MB → ${endMemory}MB`);
  }

  async testFiltering() {
    console.log('🔍 Testando filtros e busca...');
    
    const filterControls = this.findFilterControls();
    const searchInputs = this.findSearchInputs();
    
    console.log(`   Filtros: ${filterControls.length}, Buscas: ${searchInputs.length}`);

    // Teste filtros rápidos
    for (let i = 0; i < Math.min(filterControls.length, 10); i++) {
      try {
        filterControls[i].click();
        await this.wait(300);
        this.captureMetrics(`filter_${i}`);
      } catch (error) {
        this.metrics.errorCount++;
      }
    }

    // Teste busca intensiva
    for (let input of searchInputs.slice(0, 3)) {
      try {
        input.focus();
        
        const searchTerms = ['excelente', 'ruim', 'bom', 'péssimo', 'ótimo'];
        for (let term of searchTerms) {
          input.value = term;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await this.wait(500);
          
          this.captureMetrics(`search_${term}`);
        }
        
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
      } catch (error) {
        this.metrics.errorCount++;
      }
    }
  }

  async testBatchSaving() {
    console.log('💾 Testando salvamento em lote...');
    
    const saveButtons = document.querySelectorAll('button');
    const saveButtonsFiltered = Array.from(saveButtons).filter(btn => 
      btn.textContent.includes('Save') || 
      btn.textContent.includes('Salvar') ||
      btn.textContent.includes('Update') ||
      btn.className.includes('save')
    );

    console.log(`   Encontrados ${saveButtonsFiltered.length} botões de salvamento`);

    const startMemory = this.getMemoryUsage();

    // Simular salvamentos rápidos sucessivos
    for (let i = 0; i < Math.min(saveButtonsFiltered.length, 10); i++) {
      try {
        const btn = saveButtonsFiltered[i];
        if (!btn.disabled && btn.offsetParent) {
          btn.click();
          await this.wait(300);
          
          if (i % 3 === 0) {
            this.captureMetrics(`save_batch_${i}`);
          }
        }
      } catch (error) {
        this.metrics.errorCount++;
      }
    }

    const endMemory = this.getMemoryUsage();
    console.log(`   ✅ Salvamentos concluídos - Memória: ${startMemory}MB → ${endMemory}MB`);
  }

  async testScrollPerformance() {
    console.log('📜 Testando performance de scroll...');
    
    const startMemory = this.getMemoryUsage();
    
    // Scroll intensivo para testar lazy loading e virtualization
    for (let i = 0; i < 20; i++) {
      window.scrollTo(0, i * 200);
      await this.wait(100);
      
      if (i % 5 === 0) {
        this.captureMetrics(`scroll_${i}`);
      }
    }

    // Scroll de volta ao topo
    window.scrollTo(0, 0);
    await this.wait(500);

    const endMemory = this.getMemoryUsage();
    console.log(`   ✅ Scroll concluído - Memória: ${startMemory}MB → ${endMemory}MB`);
  }

  // Métodos auxiliares de localização de elementos
  findCommentFields() {
    const selectors = [
      'textarea[placeholder*="comment"]',
      'textarea[placeholder*="comentário"]', 
      'input[name*="comment"]',
      'textarea[name*="comment"]',
      '[contenteditable="true"]',
      'textarea[class*="comment"]',
      'input[class*="comment"]'
    ];
    
    let fields = [];
    for (let selector of selectors) {
      fields.push(...document.querySelectorAll(selector));
    }
    
    return fields.filter(field => field.offsetParent !== null);
  }

  findRatingControls() {
    const selectors = [
      'select[name*="rating"]',
      'input[name*="rating"]',
      '[data-rating]',
      '.rating select',
      '.rating input',
      'select[name*="sentiment"]'
    ];
    
    let controls = [];
    for (let selector of selectors) {
      controls.push(...document.querySelectorAll(selector));
    }
    
    return controls.filter(control => control.offsetParent !== null);
  }

  findFilterControls() {
    return Array.from(document.querySelectorAll('button, select, input[type="checkbox"]'))
      .filter(el => 
        el.textContent.includes('Filter') ||
        el.textContent.includes('Filtro') ||
        el.className.includes('filter') ||
        el.name?.includes('filter')
      )
      .filter(el => el.offsetParent !== null);
  }

  findSearchInputs() {
    return Array.from(document.querySelectorAll('input[type="text"], input[type="search"]'))
      .filter(input => 
        input.placeholder?.includes('search') ||
        input.placeholder?.includes('buscar') ||
        input.className.includes('search') ||
        input.name?.includes('search')
      )
      .filter(input => input.offsetParent !== null);
  }

  // Métodos de simulação
  async simulateFastTyping(element) {
    const testText = "Este é um comentário de teste para detectar vazamentos de memória durante edição intensiva de feedbacks.";
    
    element.value = '';
    
    // Simular digitação caractere por caractere (mais realista)
    for (let i = 0; i < testText.length; i++) {
      element.value += testText[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Variação aleatória na velocidade de digitação
      await this.wait(10 + Math.random() * 20);
    }
    
    // Trigger final
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async changeRating(control, value) {
    if (control.tagName === 'SELECT') {
      control.value = value.toString();
      control.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (control.type === 'radio' || control.type === 'checkbox') {
      control.checked = true;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      control.value = value.toString();
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Métodos de medição
  captureMetrics(label) {
    const now = performance.now();
    const memory = this.getMemoryUsage();
    
    this.metrics.memorySnapshots.push({
      label,
      time: now - this.startTime,
      memory,
      memoryDelta: memory - this.baselineMemory
    });
  }

  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }
    return 0;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateFinalReport() {
    console.log('');
    console.log('📊 RELATÓRIO FINAL - ANÁLISE DE PERFORMANCE');
    console.log('═══════════════════════════════════════════');
    
    const totalTime = performance.now() - this.startTime;
    const finalMemory = this.getMemoryUsage();
    const totalMemoryIncrease = finalMemory - this.baselineMemory;
    
    // Status geral
    const hasPerformanceIssue = totalMemoryIncrease > 100 || this.metrics.errorCount > 5;
    const status = hasPerformanceIssue ? '❌ PROBLEMAS DETECTADOS' : '✅ PERFORMANCE OK';
    const statusColor = hasPerformanceIssue ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold';
    
    console.log(`%c${status}`, statusColor);
    console.log('');
    
    // Métricas gerais
    console.log('📈 MÉTRICAS GERAIS:');
    console.log(`   Duração total: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`   Memória inicial: ${this.baselineMemory}MB`);
    console.log(`   Memória final: ${finalMemory}MB`);
    console.log(`   Aumento total: ${totalMemoryIncrease.toFixed(2)}MB`);
    console.log(`   Erros encontrados: ${this.metrics.errorCount}`);
    console.log(`   Snapshots capturados: ${this.metrics.memorySnapshots.length}`);
    console.log('');
    
    // Análise de snapshots
    if (this.metrics.memorySnapshots.length > 0) {
      console.log('🔍 ANÁLISE DETALHADA:');
      
      const maxMemorySnapshot = this.metrics.memorySnapshots.reduce((max, current) => 
        current.memory > max.memory ? current : max
      );
      
      const avgMemoryIncrease = this.metrics.memorySnapshots.reduce((sum, snap) => 
        sum + snap.memoryDelta, 0) / this.metrics.memorySnapshots.length;
      
      console.log(`   Pico de memória: ${maxMemorySnapshot.memory}MB (${maxMemorySnapshot.label})`);
      console.log(`   Aumento médio: ${avgMemoryIncrease.toFixed(2)}MB`);
      
      // Identificar operações problemáticas
      const problematicSnapshots = this.metrics.memorySnapshots.filter(snap => snap.memoryDelta > 20);
      if (problematicSnapshots.length > 0) {
        console.log('');
        console.log('🚨 OPERAÇÕES PROBLEMÁTICAS:');
        problematicSnapshots.forEach(snap => {
          console.log(`   ${snap.label}: +${snap.memoryDelta.toFixed(2)}MB`);
        });
      }
    }
    
    // Recomendações
    console.log('');
    console.log('💡 RECOMENDAÇÕES:');
    
    if (totalMemoryIncrease > 100) {
      console.log('   🚨 CRÍTICO: Vazamento grave de memória detectado');
      console.log('   🔧 Verificar cleanup de timers e event listeners');
      console.log('   🔧 Implementar debouncing em campos de texto');
      console.log('   🔧 Otimizar re-renders com useMemo/useCallback');
    } else if (totalMemoryIncrease > 50) {
      console.log('   ⚠️ ATENÇÃO: Uso de memória elevado');
      console.log('   🔧 Considerar otimizações de performance');
    } else {
      console.log('   ✅ Uso de memória dentro do aceitável');
    }
    
    if (this.metrics.errorCount > 0) {
      console.log(`   ❌ ${this.metrics.errorCount} erros encontrados durante o teste`);
      console.log('   🔧 Verificar robustez dos seletores de elementos');
    }
    
    console.log('');
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Executar teste em produção com dados reais');
    console.log('   2. Monitorar Chrome DevTools > Memory durante edição');
    console.log('   3. Implementar performance monitoring em produção');
    console.log('   4. Considerar virtual scrolling para listas grandes');
  }
}

// 🚀 EXECUTAR TESTE
console.log('%c🎯 INICIANDO TESTE ESPECÍFICO DA ANÁLISE...', 'color: purple; font-size: 16px; font-weight: bold');

setTimeout(() => {
  const tester = new AnalysisPageTester();
  tester.runCompleteTest();
}, 1000);

// Exportar para uso manual
window.analysisPageTester = {
  runFullTest: () => new AnalysisPageTester().runCompleteTest(),
  
  runQuickTest: async () => {
    const tester = new AnalysisPageTester();
    await tester.testCommentEditing();
    tester.generateFinalReport();
  }
};
