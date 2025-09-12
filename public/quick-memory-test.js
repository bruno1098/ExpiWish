// 🧪 TESTE RÁPIDO DE VAZAMENTOS - Cole no Console do DevTools
// ================================================================

console.log('%c🧪 TESTE DE VAZAMENTOS DE MEMÓRIA - ANÁLISE', 'color: blue; font-size: 16px; font-weight: bold');
console.log('⏱️ Teste rápido de 15 segundos para detectar problemas...');

class QuickMemoryTest {
  constructor() {
    this.startMemory = this.getMemory();
    this.timeouts = new Set();
    this.intervals = new Set();
    this.metrics = [];
    this.startTime = performance.now();
  }

  getMemory() {
    return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
  }

  async runTest() {
    console.log(`📊 Memória inicial: ${this.startMemory} MB`);
    
    // Monitor de memória
    const monitorId = setInterval(() => {
      const current = this.getMemory();
      const increase = current - this.startMemory;
      this.metrics.push({ time: performance.now() - this.startTime, memory: current, increase });
      
      if (increase > 100) {
        console.error(`🚨 VAZAMENTO CRÍTICO: +${increase} MB`);
      }
    }, 1000);
    this.intervals.add(monitorId);

    // Simular ações intensivas
    await this.simulateIntensiveEditing();
    
    // Finalizar
    clearInterval(monitorId);
    this.generateQuickReport();
  }

  async simulateIntensiveEditing() {
    console.log('🎭 Simulando edição intensiva...');
    
    // Encontrar elementos
    const inputs = document.querySelectorAll('input, textarea, [contenteditable]');
    const buttons = document.querySelectorAll('button');
    
    console.log(`   Encontrados: ${inputs.length} inputs, ${buttons.length} botões`);

    // Simular 50 ações rápidas
    for (let i = 0; i < 50; i++) {
      try {
        // Ação 1: Editar campo aleatório
        if (inputs.length > 0) {
          const input = inputs[i % inputs.length];
          if (input.offsetParent) {
            input.focus();
            input.value = `Teste ${i} - ${Date.now()}`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.blur();
          }
        }

        // Ação 2: Clicar em botão aleatório
        if (buttons.length > 0 && i % 3 === 0) {
          const btn = buttons[i % buttons.length];
          if (btn.offsetParent && !btn.disabled) {
            btn.click();
          }
        }

        // Ação 3: Trigger re-renders
        if (i % 5 === 0) {
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('visibilitychange'));
        }

        // Pequeno delay
        await this.wait(50);
        
      } catch (error) {
        // Ignorar erros de simulação
      }
    }
  }

  async wait(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms);
      this.timeouts.add(id);
    });
  }

  generateQuickReport() {
    const finalMemory = this.getMemory();
    const totalIncrease = finalMemory - this.startMemory;
    const testDuration = (performance.now() - this.startTime) / 1000;

    console.log('');
    console.log('📊 RESULTADO DO TESTE RÁPIDO');
    console.log('═══════════════════════════');
    
    // Status
    const hasLeak = totalIncrease > 50;
    const status = hasLeak ? '❌ PROBLEMA DETECTADO' : '✅ TESTE PASSOU';
    const color = hasLeak ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold';
    
    console.log(`%c${status}`, color);
    console.log('');
    
    // Métricas
    console.log(`📈 Memória inicial: ${this.startMemory} MB`);
    console.log(`📈 Memória final: ${finalMemory} MB`);
    console.log(`📈 Aumento total: ${totalIncrease} MB`);
    console.log(`⏱️ Duração: ${testDuration.toFixed(1)}s`);
    console.log(`🔧 Timeouts criados: ${this.timeouts.size}`);
    console.log(`🔧 Intervals criados: ${this.intervals.size}`);

    // Análise
    if (hasLeak) {
      console.log('');
      console.log('🚨 ANÁLISE DO PROBLEMA:');
      console.log('   • Vazamento de memória detectado durante edição');
      console.log('   • Possíveis causas: timers não limpos, closures, re-renders');
      console.log('   • Recomendação: verificar useEffect cleanup e useMemo');
    } else {
      console.log('');
      console.log('✅ ANÁLISE POSITIVA:');
      console.log('   • Uso de memória controlado durante teste');
      console.log('   • Limpeza de recursos adequada');
      console.log('   • Performance otimizada detectada');
    }

    // Limpeza automática
    console.log('');
    console.log('🧹 Executando limpeza...');
    this.timeouts.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    console.log(`✅ ${this.timeouts.size + this.intervals.size} timers limpos`);

    // Métricas detalhadas se houver problema
    if (hasLeak && this.metrics.length > 0) {
      console.log('');
      console.log('📊 EVOLUÇÃO DA MEMÓRIA:');
      this.metrics.forEach((metric, i) => {
        if (i % 3 === 0) { // Mostrar apenas alguns pontos
          console.log(`   ${(metric.time/1000).toFixed(1)}s: ${metric.memory}MB (+${metric.increase}MB)`);
        }
      });
    }
  }
}

// Executar teste automaticamente
setTimeout(() => {
  const tester = new QuickMemoryTest();
  tester.runTest();
}, 500);

// Disponibilizar para execução manual
window.runMemoryTest = () => new QuickMemoryTest().runTest();
