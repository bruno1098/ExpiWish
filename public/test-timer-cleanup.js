/**
 * 🕰️ TESTE DE TIMEOUT/INTERVAL CLEANUP
 * 
 * Este script detecta especificamente vazamentos de setTimeout/setInterval
 * que são a causa mais comum de travamentos do Chrome.
 */

// Monitor de timers ativos
class TimerMonitor {
  constructor() {
    this.originalSetTimeout = window.setTimeout;
    this.originalClearTimeout = window.clearTimeout;
    this.originalSetInterval = window.setInterval;
    this.originalClearInterval = window.clearInterval;
    
    this.activeTimeouts = new Map();
    this.activeIntervals = new Map();
    this.timeoutCounter = 0;
    this.intervalCounter = 0;
  }

  startMonitoring() {
    console.log('⏰ Iniciando monitoramento de timers...');
    
    // Interceptar setTimeout
    window.setTimeout = (callback, delay, ...args) => {
      const id = this.originalSetTimeout.call(window, (...callbackArgs) => {
        this.activeTimeouts.delete(id);
        return callback(...callbackArgs);
      }, delay, ...args);
      
      this.activeTimeouts.set(id, {
        created: Date.now(),
        delay,
        stack: new Error().stack
      });
      this.timeoutCounter++;
      
      return id;
    };

    // Interceptar clearTimeout  
    window.clearTimeout = (id) => {
      this.activeTimeouts.delete(id);
      return this.originalClearTimeout.call(window, id);
    };

    // Interceptar setInterval
    window.setInterval = (callback, delay, ...args) => {
      const id = this.originalSetInterval.call(window, callback, delay, ...args);
      
      this.activeIntervals.set(id, {
        created: Date.now(),
        delay,
        stack: new Error().stack
      });
      this.intervalCounter++;
      
      return id;
    };

    // Interceptar clearInterval
    window.clearInterval = (id) => {
      this.activeIntervals.delete(id);
      return this.originalClearInterval.call(window, id);
    };
  }

  getReport() {
    const now = Date.now();
    const oldTimeouts = Array.from(this.activeTimeouts.entries()).filter(
      ([id, data]) => now - data.created > 60000 // Mais de 1 minuto
    );
    
    const oldIntervals = Array.from(this.activeIntervals.entries()).filter(
      ([id, data]) => now - data.created > 60000
    );

    return {
      totalTimeoutsCreated: this.timeoutCounter,
      totalIntervalsCreated: this.intervalCounter,
      activeTimeouts: this.activeTimeouts.size,
      activeIntervals: this.activeIntervals.size,
      suspiciousTimeouts: oldTimeouts.length,
      suspiciousIntervals: oldIntervals.length,
      oldTimeouts,
      oldIntervals
    };
  }

  cleanup() {
    // Restaurar funções originais
    window.setTimeout = this.originalSetTimeout;
    window.clearTimeout = this.originalClearTimeout;
    window.setInterval = this.originalSetInterval;
    window.clearInterval = this.originalClearInterval;
    
    // Limpar timers suspeitos
    this.activeTimeouts.forEach((data, id) => this.originalClearTimeout(id));
    this.activeIntervals.forEach((data, id) => this.originalClearInterval(id));
    
    console.log(`🧹 Limpeza: ${this.activeTimeouts.size} timeouts + ${this.activeIntervals.size} intervals removidos`);
  }
}

// Teste de stress para componentes React
class ReactStressTest {
  constructor() {
    this.timerMonitor = new TimerMonitor();
  }

  async runTimerTest() {
    console.log('🧪 TESTE DE CLEANUP DE TIMERS');
    console.log('═════════════════════════════════');
    
    this.timerMonitor.startMonitoring();
    
    // Simular ações que podem criar timers
    await this.simulateReactInteractions();
    
    // Aguardar um pouco para timers serem criados
    await this.wait(5000);
    
    const report = this.timerMonitor.getReport();
    this.generateTimerReport(report);
    
    return report;
  }

  async simulateReactInteractions() {
    console.log('🎭 Simulando interações React...');
    
    const interactions = [
      () => this.triggerStateUpdates(),
      () => this.simulateModalOpenClose(),
      () => this.simulateFormSubmissions(),
      () => this.triggerReRenders(),
      () => this.simulateEditingFlow()
    ];

    for (let i = 0; i < 10; i++) {
      console.log(`🔄 Interação ${i + 1}/10`);
      
      // Executar algumas interações aleatórias
      const randomInteractions = this.shuffleArray(interactions).slice(0, 3);
      for (let interaction of randomInteractions) {
        try {
          await interaction();
          await this.wait(200);
        } catch (error) {
          console.warn('Erro na interação:', error.message);
        }
      }
      
      await this.wait(500);
    }
  }

  async triggerStateUpdates() {
    // Encontrar inputs e simular mudanças
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      if (input.offsetParent) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  async simulateModalOpenClose() {
    // Procurar e clicar em botões que podem abrir modais
    const buttons = document.querySelectorAll('button:not([disabled])');
    const modalTriggers = Array.from(buttons).filter(btn => 
      btn.textContent.includes('Edit') || 
      btn.textContent.includes('Add') ||
      btn.textContent.includes('View') ||
      btn.querySelector('svg')
    );

    if (modalTriggers.length > 0) {
      const randomButton = modalTriggers[Math.floor(Math.random() * modalTriggers.length)];
      randomButton.click();
      
      await this.wait(500);
      
      // Tentar fechar modal (ESC ou botão close)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      const closeButtons = document.querySelectorAll('[aria-label="Close"], .close, button[data-dismiss]');
      if (closeButtons.length > 0) {
        closeButtons[0].click();
      }
    }
  }

  async simulateFormSubmissions() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        // Simular submit sem realmente enviar
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    });
  }

  async triggerReRenders() {
    // Disparar eventos que podem causar re-renders
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new Event('visibilitychange'));
    
    // Simular mudanças de hash/URL que podem trigger re-renders
    if (window.location.hash !== '#test') {
      window.location.hash = '#test';
      await this.wait(100);
      history.back();
    }
  }

  async simulateEditingFlow() {
    // Simular o fluxo de edição que causa travamento
    const editableElements = document.querySelectorAll('[contenteditable], input, textarea');
    
    editableElements.forEach(element => {
      if (element.offsetParent) {
        element.focus();
        
        // Simular digitação rápida
        for (let i = 0; i < 5; i++) {
          element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: 'a' }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
        }
        
        element.blur();
      }
    });
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateTimerReport(report) {
    console.log('');
    console.log('⏰ RELATÓRIO DE TIMERS');
    console.log('══════════════════════');
    
    // Status geral
    const hasTimerLeak = report.activeTimeouts > 10 || report.activeIntervals > 5 || 
                        report.suspiciousTimeouts > 0 || report.suspiciousIntervals > 0;
    
    const status = hasTimerLeak ? '❌ VAZAMENTOS DETECTADOS' : '✅ TIMERS OK';
    const statusColor = hasTimerLeak ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold';
    
    console.log(`%c${status}`, statusColor);
    console.log('');
    
    // Estatísticas
    console.log('📊 ESTATÍSTICAS:');
    console.log(`   Timeouts criados: ${report.totalTimeoutsCreated}`);
    console.log(`   Intervals criados: ${report.totalIntervalsCreated}`);
    console.log(`   Timeouts ativos: ${report.activeTimeouts}`);
    console.log(`   Intervals ativos: ${report.activeIntervals}`);
    console.log(`   Timeouts suspeitos (>1min): ${report.suspiciousTimeouts}`);
    console.log(`   Intervals suspeitos (>1min): ${report.suspiciousIntervals}`);
    
    // Detalhes dos vazamentos
    if (report.suspiciousTimeouts > 0) {
      console.log('');
      console.log('🚨 TIMEOUTS SUSPEITOS:');
      report.oldTimeouts.forEach(([id, data]) => {
        console.log(`   ID ${id}: ${Date.now() - data.created}ms ativo`);
        console.log(`   Stack trace:`, data.stack.split('\n').slice(1, 4));
      });
    }
    
    if (report.suspiciousIntervals > 0) {
      console.log('');
      console.log('🚨 INTERVALS SUSPEITOS:');
      report.oldIntervals.forEach(([id, data]) => {
        console.log(`   ID ${id}: ${Date.now() - data.created}ms ativo`);
        console.log(`   Stack trace:`, data.stack.split('\n').slice(1, 4));
      });
    }
    
    // Recomendações
    console.log('');
    console.log('💡 RECOMENDAÇÕES:');
    if (hasTimerLeak) {
      console.log('   🔧 Implementar useRef para cleanup de timers');
      console.log('   🧹 Adicionar useEffect cleanup functions');
      console.log('   ⚠️ Verificar components que criam timers sem limpar');
    } else {
      console.log('   ✅ Timers estão sendo limpos corretamente');
    }
    
    // Cleanup automático
    if (hasTimerLeak) {
      console.log('');
      console.log('🧹 Executando limpeza automática...');
      this.timerMonitor.cleanup();
    }
  }
}

// 🚀 EXECUTAR TESTE DE TIMERS
console.log('%c⏰ INICIANDO TESTE DE TIMERS...', 'color: orange; font-size: 16px; font-weight: bold');

setTimeout(() => {
  const timerTest = new ReactStressTest();
  timerTest.runTimerTest();
}, 1000);

// Exportar para uso manual
window.timerTester = {
  runTest: () => new ReactStressTest().runTimerTest(),
  
  cleanupAllTimers: () => {
    const monitor = new TimerMonitor();
    monitor.startMonitoring();
    setTimeout(() => {
      monitor.cleanup();
    }, 1000);
  }
};
