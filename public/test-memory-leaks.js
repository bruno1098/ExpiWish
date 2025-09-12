/**
 * 🧪 TESTE DE VAZAMENTOS DE MEMÓRIA - Página de Análise
 * 
 * Cole este código completo no console do Chrome DevTools
 * Para detectar vazamentos em 30 segundos
 */

// Configurações do teste
const TEST_CONFIG = {
  SIMULATION_CYCLES: 90,
  CLICK_INTERVAL: 50,
  MEMORY_CHECK_INTERVAL: 1000,
  MAX_MEMORY_INCREASE: 50,
  TEST_DURATION: 300000
};

// Estado do teste
let testState = {
  startMemory: 0,
  currentMemory: 0,
  maxMemory: 0,
  cyclesCompleted: 0,
  memoryLeakDetected: false,
  startTime: Date.now(),
  timeoutIds: new Set(),
  intervalIds: new Set()
};

/**
 * 🚀 Monitor de Performance e Memória
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.isRunning = false;
  }

  start() {
    console.log('🔍 Iniciando monitoramento de performance...');
    this.isRunning = true;
    this.startTime = performance.now();
    this.initialMemory = this.getMemoryUsage();
    
    const intervalId = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }
      
      const memory = this.getMemoryUsage();
      const time = performance.now() - this.startTime;
      
      this.measurements.push({
        time,
        memory,
        memoryDelta: memory - this.initialMemory
      });
      
      this.checkForMemoryLeak(memory);
    }, TEST_CONFIG.MEMORY_CHECK_INTERVAL);
    
    testState.intervalIds.add(intervalId);
  }

  stop() {
    this.isRunning = false;
    return this.generateReport();
  }

  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }
    return 0;
  }

  checkForMemoryLeak(currentMemory) {
    const memoryIncrease = currentMemory - this.initialMemory;
    
    if (memoryIncrease > TEST_CONFIG.MAX_MEMORY_INCREASE) {
      testState.memoryLeakDetected = true;
      console.error(`🚨 VAZAMENTO DE MEMÓRIA DETECTADO!`);
      console.error(`💾 Aumento: ${memoryIncrease.toFixed(2)} MB`);
      console.error(`📊 Memória inicial: ${this.initialMemory} MB`);
      console.error(`📊 Memória atual: ${currentMemory} MB`);
    }
  }

  generateReport() {
    const finalMemory = this.getMemoryUsage();
    const totalIncrease = finalMemory - this.initialMemory;
    const avgMemory = this.measurements.reduce((sum, m) => sum + m.memory, 0) / this.measurements.length;
    
    return {
      initialMemory: this.initialMemory,
      finalMemory,
      totalIncrease,
      avgMemory,
      maxMemory: Math.max(...this.measurements.map(m => m.memory)),
      measurements: this.measurements,
      hasMemoryLeak: totalIncrease > TEST_CONFIG.MAX_MEMORY_INCREASE
    };
  }
}

/**
 * 🎯 Simulador de Ações do Usuário
 */
class UserActionSimulator {
  constructor() {
    this.feedbacks = [];
    this.currentIndex = 0;
  }

  init() {
    // Encontrar feedbacks na página
    this.feedbacks = Array.from(document.querySelectorAll('[data-testid="feedback-card"], .feedback-card, [class*="feedback"]')).slice(0, 5);
    
    if (this.feedbacks.length === 0) {
      console.warn('⚠️ Nenhum feedback encontrado. Tentando seletores alternativos...');
      this.feedbacks = Array.from(document.querySelectorAll('div')).filter(div => 
        div.textContent.includes('rating') || 
        div.textContent.includes('feedback') ||
        div.querySelector('button')
      ).slice(0, 5);
    }
    
    console.log(`✅ ${this.feedbacks.length} feedbacks encontrados para simulação`);
    return this.feedbacks.length > 0;
  }

  async simulateEditingCycle() {
    if (this.feedbacks.length === 0) return false;

    const feedback = this.feedbacks[this.currentIndex % this.feedbacks.length];
    
    try {
      // 1. Simular abertura de modal/edição
      await this.clickElement(feedback, '📝 Abrindo feedback');
      await this.wait(50);

      // 2. Procurar e clicar em botão de editar
      const editButtons = feedback.querySelectorAll('button, [role="button"]');
      for (let btn of editButtons) {
        if (btn.textContent.includes('Edit') || btn.textContent.includes('Editar') || 
            btn.querySelector('[data-lucide="edit"]') || btn.querySelector('svg')) {
          await this.clickElement(btn, '✏️ Clicando em editar');
          await this.wait(50);
          break;
        }
      }

      // 3. Simular digitação em inputs
      const inputs = feedback.querySelectorAll('input, textarea, [contenteditable="true"]');
      for (let input of inputs) {
        if (input.offsetParent !== null) {
          await this.simulateTyping(input);
          await this.wait(30);
        }
      }

      // 4. Procurar e clicar em botão salvar
      const saveButtons = feedback.querySelectorAll('button, [role="button"]');
      for (let btn of saveButtons) {
        if (btn.textContent.includes('Save') || btn.textContent.includes('Salvar') || 
            btn.textContent.includes('OK') || btn.className.includes('save')) {
          await this.clickElement(btn, '💾 Salvando alterações');
          await this.wait(100);
          break;
        }
      }

      testState.cyclesCompleted++;
      this.currentIndex++;
      
      return true;
    } catch (error) {
      console.warn(`⚠️ Erro no ciclo de edição:`, error.message);
      return false;
    }
  }

  async clickElement(element, description = '') {
    if (!element) return;
    
    if (description) console.log(description);
    
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.focus();
    }
  }

  async simulateTyping(input) {
    if (!input) return;
    
    const testTexts = [
      'Teste automatizado de performance',
      'Verificando vazamentos de memória', 
      'Simulação de edição intensiva',
      'Teste de stress da interface'
    ];
    
    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
    
    input.focus();
    input.value = randomText;
    
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async wait(ms) {
    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, ms);
      testState.timeoutIds.add(timeoutId);
    });
  }
}

/**
 * 🎮 Controller Principal do Teste
 */
class MemoryLeakTester {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.simulator = new UserActionSimulator();
  }

  async runTest() {
    console.log('🧪 INICIANDO TESTE DE VAZAMENTOS DE MEMÓRIA');
    console.log('⚡ Configuração:', TEST_CONFIG);
    console.log('🎯 Este teste vai simular uso intensivo em 30 segundos');
    console.log('───────────────────────────────────────────────');

    if (!this.simulator.init()) {
      console.error('❌ Não foi possível inicializar o simulador');
      return;
    }

    this.monitor.start();

    const startTime = Date.now();
    let cycles = 0;

    const testLoop = async () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= TEST_CONFIG.TEST_DURATION || cycles >= TEST_CONFIG.SIMULATION_CYCLES) {
        return this.finishTest();
      }

      console.log(`🔄 Ciclo ${cycles + 1}/${TEST_CONFIG.SIMULATION_CYCLES}`);
      
      await this.simulator.simulateEditingCycle();
      cycles++;

      setTimeout(testLoop, TEST_CONFIG.CLICK_INTERVAL);
    };

    await testLoop();
  }

  finishTest() {
    console.log('🏁 Finalizando teste...');
    
    const report = this.monitor.stop();
    this.cleanup();
    this.generateFinalReport(report);
  }

  cleanup() {
    testState.timeoutIds.forEach(id => clearTimeout(id));
    testState.intervalIds.forEach(id => clearInterval(id));
    
    console.log(`🧹 Limpeza concluída: ${testState.timeoutIds.size + testState.intervalIds.size} timers removidos`);
  }

  generateFinalReport(report) {
    console.log('');
    console.log('📊 RELATÓRIO FINAL - TESTE DE VAZAMENTOS DE MEMÓRIA');
    console.log('═══════════════════════════════════════════════════');
    
    const status = report.hasMemoryLeak ? '❌ REPROVADO' : '✅ APROVADO';
    const statusColor = report.hasMemoryLeak ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold';
    
    console.log(`%c${status}`, statusColor);
    console.log('');
    
    console.log('💾 MÉTRICAS DE MEMÓRIA:');
    console.log(`   Inicial: ${report.initialMemory} MB`);
    console.log(`   Final: ${report.finalMemory} MB`);
    console.log(`   Aumento: ${report.totalIncrease.toFixed(2)} MB`);
    console.log(`   Máxima: ${report.maxMemory} MB`);
    console.log(`   Média: ${report.avgMemory.toFixed(2)} MB`);
    console.log('');
    
    console.log('📈 MÉTRICAS DE ATIVIDADE:');
    console.log(`   Ciclos completados: ${testState.cyclesCompleted}`);
    console.log(`   Duração: ${(Date.now() - testState.startTime) / 1000}s`);
    console.log(`   Timeouts criados: ${testState.timeoutIds.size}`);
    console.log('');
    
    console.log('🔍 DIAGNÓSTICO:');
    if (report.hasMemoryLeak) {
      console.log('%c   ⚠️ VAZAMENTO DE MEMÓRIA DETECTADO!', 'color: orange; font-weight: bold');
      console.log('   📋 Possíveis causas:');
      console.log('      • setTimeout/setInterval sem clearTimeout/clearInterval');
      console.log('      • Event listeners não removidos');
      console.log('      • Closures mantendo referências');
      console.log('      • Re-renders excessivos');
    } else {
      console.log('%c   ✅ Nenhum vazamento crítico detectado', 'color: green');
      console.log('   🎉 A página está otimizada para uso prolongado');
    }
    
    console.log('');
    console.log('💡 RECOMENDAÇÕES:');
    if (report.totalIncrease > 20) {
      console.log('   🔧 Considere otimizar o uso de memória');
    }
    if (testState.timeoutIds.size > 10) {
      console.log('   ⏰ Muitos timeouts ativos - verificar cleanup');
    }
    console.log('   📊 Use Chrome DevTools > Memory para análise detalhada');
    console.log('   🔄 Execute este teste após mudanças no código');
  }
}

// 🚀 EXECUTAR TESTE AUTOMATICAMENTE
console.log('%c🧪 CARREGANDO TESTE DE VAZAMENTOS DE MEMÓRIA...', 'color: blue; font-size: 16px; font-weight: bold');

setTimeout(() => {
  const tester = new MemoryLeakTester();
  tester.runTest();
}, 1000);

// Disponibilizar comandos manuais
window.memoryLeakTester = {
  runQuickTest: () => {
    TEST_CONFIG.SIMULATION_CYCLES = 50;
    TEST_CONFIG.TEST_DURATION = 35000;
    new MemoryLeakTester().runTest();
  },
  
  runExtensiveTest: () => {
    TEST_CONFIG.SIMULATION_CYCLES = 1000;
    TEST_CONFIG.TEST_DURATION = 100000;
    new MemoryLeakTester().runTest();
  }
};

console.log('🎮 COMANDOS MANUAIS DISPONÍVEIS:');
console.log('   memoryLeakTester.runQuickTest()    - Teste rápido (15s)');
console.log('   memoryLeakTester.runExtensiveTest() - Teste extenso (60s)');
