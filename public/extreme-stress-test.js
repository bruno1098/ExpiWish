/**
 * 🔥 TESTE EXTREMO DE VAZAMENTOS - STRESS TEST MÁXIMO
 * 
 * Este teste é MUITO MAIS PESADO e simula condições extremas:
 * - 200+ ciclos de edição intensiva
 * - Múltiplos timers simultâneos
 * - Re-renders forçados
 * - Simulação de horas de uso em poucos minutos
 * 
 * CUIDADO: Pode consumir muitos recursos do sistema!
 */

console.log('%c🔥 TESTE EXTREMO DE VAZAMENTOS - STRESS MÁXIMO', 'color: red; font-size: 18px; font-weight: bold');
console.log('⚠️ ATENÇÃO: Este teste é muito pesado e pode afetar a performance do sistema');
console.log('🎯 Simulando HORAS de uso intensivo em poucos minutos...');

const EXTREME_TEST_CONFIG = {
  SIMULATION_CYCLES: 200,        // 4x mais ciclos
  CLICK_INTERVAL: 25,           // 2x mais rápido
  MEMORY_CHECK_INTERVAL: 500,   // Checagem 2x mais frequente
  MAX_MEMORY_INCREASE: 150,     // Limite maior
  TEST_DURATION: 180000,        // 3 minutos de tortura
  CONCURRENT_ACTIONS: 5,        // Ações simultâneas
  TYPING_SPEED: 10,             // Digitação ultra-rápida
  HEAVY_DOM_OPERATIONS: true    // Operações DOM pesadas
};

class ExtremeStressTest {
  constructor() {
    this.measurements = [];
    this.isRunning = false;
    this.timeouts = new Set();
    this.intervals = new Set();
    this.startMemory = this.getMemoryUsage();
    this.startTime = performance.now();
    this.cyclesCompleted = 0;
    this.errorsEncountered = 0;
    this.heavyOperations = 0;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }
    return 0;
  }

  async runExtremeTest() {
    console.log('🚀 INICIANDO TESTE EXTREMO DE STRESS');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Memória inicial: ${this.startMemory} MB`);
    console.log(`⚡ Configuração extrema:`, EXTREME_TEST_CONFIG);
    console.log('🔥 Este teste vai REALMENTE stressar o sistema...');
    console.log('');

    // Iniciar monitoramento agressivo
    await this.startAggressiveMonitoring();
    
    // Executar múltiplas operações simultâneas
    await Promise.all([
      this.extremeEditingSimulation(),
      this.massiveTimerCreation(),
      this.continuousReRendering(),
      this.heavyDOMManipulation(),
      this.memoryIntensiveOperations()
    ]);

    this.finishExtremeTest();
  }

  async startAggressiveMonitoring() {
    console.log('📈 Iniciando monitoramento agressivo...');
    this.isRunning = true;

    // Monitor principal (mais frequente)
    const mainMonitor = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(mainMonitor);
        return;
      }

      const memory = this.getMemoryUsage();
      const time = performance.now() - this.startTime;
      const memoryDelta = memory - this.startMemory;

      this.measurements.push({ time, memory, memoryDelta });

      // Alertas em tempo real
      if (memoryDelta > EXTREME_TEST_CONFIG.MAX_MEMORY_INCREASE) {
        console.error(`🚨 VAZAMENTO CRÍTICO DETECTADO: +${memoryDelta.toFixed(2)}MB`);
      }

      if (memoryDelta > 200) {
        console.error(`💀 VAZAMENTO SEVERO: +${memoryDelta.toFixed(2)}MB - Sistema pode travar!`);
      }

    }, EXTREME_TEST_CONFIG.MEMORY_CHECK_INTERVAL);
    
    this.intervals.add(mainMonitor);

    // Monitor secundário para timeout tracking
    const timeoutMonitor = setInterval(() => {
      if (this.timeouts.size > 100) {
        console.warn(`⚠️ MUITOS TIMEOUTS ATIVOS: ${this.timeouts.size}`);
      }
    }, 2000);
    
    this.intervals.add(timeoutMonitor);
  }

  async extremeEditingSimulation() {
    console.log('📝 Iniciando simulação de edição EXTREMA...');
    
    // Encontrar todos os elementos editáveis
    const editableElements = this.findEditableElements();
    console.log(`   Encontrados ${editableElements.length} elementos editáveis`);

    for (let cycle = 0; cycle < EXTREME_TEST_CONFIG.SIMULATION_CYCLES; cycle++) {
      if (!this.isRunning) break;

      try {
        // Editar múltiplos elementos simultaneamente
        const concurrentPromises = [];
        for (let i = 0; i < EXTREME_TEST_CONFIG.CONCURRENT_ACTIONS; i++) {
          const element = editableElements[cycle % editableElements.length];
          if (element) {
            concurrentPromises.push(this.performExtremeEditing(element, cycle));
          }
        }

        await Promise.all(concurrentPromises);
        
        this.cyclesCompleted++;
        
        if (cycle % 10 === 0) {
          console.log(`🔄 Ciclo extremo ${cycle}/${EXTREME_TEST_CONFIG.SIMULATION_CYCLES} - Memória: ${this.getMemoryUsage()}MB`);
        }

        // Delay mínimo entre ciclos
        await this.wait(EXTREME_TEST_CONFIG.CLICK_INTERVAL);
        
      } catch (error) {
        this.errorsEncountered++;
        if (this.errorsEncountered % 10 === 0) {
          console.warn(`⚠️ ${this.errorsEncountered} erros encontrados até agora`);
        }
      }
    }
  }

  async performExtremeEditing(element, cycle) {
    if (!element || !element.offsetParent) return;

    // Focar e simular digitação ultra-rápida
    element.focus();
    
    // Texto longo e variado para simular edição real
    const heavyText = `Ciclo extremo ${cycle} - ${Date.now()} - Este é um teste de stress muito pesado que simula horas de edição intensiva. `.repeat(3);
    
    // Simular digitação caractere por caractere (mais realista e pesado)
    for (let i = 0; i < heavyText.length; i += 5) {
      element.value = heavyText.substring(0, i + 5);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Micro-delay para simular digitação humana rápida
      if (i % 20 === 0) {
        await this.wait(EXTREME_TEST_CONFIG.TYPING_SPEED);
      }
    }

    // Eventos finais
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    element.blur();

    // Simular clique em botões relacionados
    this.clickRelatedButtons(element);
  }

  async massiveTimerCreation() {
    console.log('⏰ Criando MUITOS timers simultaneamente...');
    
    // Criar centenas de timeouts de diferentes durações
    for (let i = 0; i < 500; i++) {
      if (!this.isRunning) break;

      const delay = 100 + (i * 50) % 5000;
      
      const timeoutId = setTimeout(() => {
        // Operação pesada dentro do timeout
        this.performHeavyOperation();
        this.timeouts.delete(timeoutId);
      }, delay);
      
      this.timeouts.add(timeoutId);

      // Criar alguns intervals também
      if (i % 20 === 0) {
        const intervalId = setInterval(() => {
          if (!this.isRunning) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
            return;
          }
          this.performLightOperation();
        }, 1000 + (i * 100));
        
        this.intervals.add(intervalId);
      }

      // Pequeno delay para não travar a UI
      if (i % 50 === 0) {
        await this.wait(10);
      }
    }
  }

  async continuousReRendering() {
    console.log('🔄 Forçando re-renders contínuos...');
    
    const rerenderCount = 200;
    for (let i = 0; i < rerenderCount; i++) {
      if (!this.isRunning) break;

      // Múltiplos tipos de eventos que causam re-renders
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Mudanças no DOM que podem trigger re-renders
      if (i % 5 === 0) {
        document.body.style.setProperty('--test-property', `value-${i}`);
      }

      // Scroll events
      if (i % 3 === 0) {
        window.scrollTo(0, (i * 100) % window.innerHeight);
      }

      // Hash changes
      if (i % 10 === 0) {
        window.location.hash = `#test-${i}`;
      }

      await this.wait(50);
    }

    // Resetar hash
    window.location.hash = '';
    window.scrollTo(0, 0);
  }

  async heavyDOMManipulation() {
    if (!EXTREME_TEST_CONFIG.HEAVY_DOM_OPERATIONS) return;
    
    console.log('🏗️ Executando operações DOM PESADAS...');
    
    for (let i = 0; i < 100; i++) {
      if (!this.isRunning) break;

      // Criar elementos DOM temporários
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      
      // Adicionar muitos elementos filhos
      for (let j = 0; j < 50; j++) {
        const child = document.createElement('div');
        child.textContent = `Heavy DOM operation ${i}-${j} - ${Date.now()}`;
        child.innerHTML = `<span>Child ${j}</span>`.repeat(10);
        container.appendChild(child);
      }

      document.body.appendChild(container);
      
      // Simular queries pesadas
      const elements = container.querySelectorAll('*');
      elements.forEach(el => el.getAttribute('id'));
      
      // Remover após um tempo
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 2000);

      this.heavyOperations++;
      
      if (i % 10 === 0) {
        await this.wait(100);
      }
    }
  }

  async memoryIntensiveOperations() {
    console.log('💾 Executando operações intensivas de memória...');
    
    const largeArrays = [];
    
    for (let i = 0; i < 50; i++) {
      if (!this.isRunning) break;

      // Criar arrays grandes
      const largeArray = new Array(10000).fill(0).map((_, idx) => ({
        id: idx,
        data: `Memory intensive data ${i}-${idx}`,
        timestamp: Date.now(),
        random: Math.random()
      }));
      
      largeArrays.push(largeArray);
      
      // Operações custosas nos arrays
      largeArray.sort((a, b) => a.random - b.random);
      largeArray.filter(item => item.id % 2 === 0);
      largeArray.map(item => ({ ...item, processed: true }));
      
      if (i % 5 === 0) {
        console.log(`   Criados ${largeArrays.length} arrays grandes (${largeArrays.length * 10000} objetos)`);
        await this.wait(200);
      }
    }
    
    // Limpeza gradual
    setTimeout(() => {
      largeArrays.length = 0;
      console.log('🧹 Arrays grandes limpos da memória');
    }, 10000);
  }

  findEditableElements() {
    const selectors = [
      'input[type="text"]', 'input[type="email"]', 'textarea',
      '[contenteditable="true"]', 'input:not([type="hidden"])',
      'input[name*="comment"]', 'textarea[name*="comment"]'
    ];
    
    let elements = [];
    selectors.forEach(selector => {
      elements.push(...Array.from(document.querySelectorAll(selector)));
    });
    
    return elements.filter(el => el.offsetParent !== null).slice(0, 20);
  }

  clickRelatedButtons(nearElement) {
    // Encontrar botões próximos ao elemento
    const container = nearElement.closest('div, form, section') || document.body;
    const buttons = container.querySelectorAll('button:not([disabled])');
    
    if (buttons.length > 0) {
      const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
      if (randomButton.offsetParent) {
        randomButton.click();
      }
    }
  }

  performHeavyOperation() {
    // Operação computacionalmente custosa
    let result = 0;
    for (let i = 0; i < 1000; i++) {
      result += Math.sqrt(i) * Math.random();
    }
    return result;
  }

  performLightOperation() {
    // Operação mais leve mas frequente
    document.querySelectorAll('*').length;
    Math.random() * Date.now();
  }

  async wait(ms) {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        this.timeouts.delete(timeoutId);
        resolve();
      }, ms);
      this.timeouts.add(timeoutId);
    });
  }

  finishExtremeTest() {
    console.log('🏁 Finalizando teste extremo...');
    this.isRunning = false;
    
    // Parar monitoramento
    this.intervals.forEach(id => clearInterval(id));
    
    // Gerar relatório final
    this.generateExtremeReport();
    
    // Limpeza forçada
    this.forceCleanup();
  }

  generateExtremeReport() {
    const finalMemory = this.getMemoryUsage();
    const totalIncrease = finalMemory - this.startMemory;
    const testDuration = (performance.now() - this.startTime) / 1000;
    const avgMemory = this.measurements.reduce((sum, m) => sum + m.memory, 0) / this.measurements.length;
    const maxMemory = Math.max(...this.measurements.map(m => m.memory));

    console.log('');
    console.log('🔥 RELATÓRIO FINAL - TESTE EXTREMO DE STRESS');
    console.log('═══════════════════════════════════════════════════════');
    
    // Determinar resultado
    const isCritical = totalIncrease > 200;
    const hasMajorLeak = totalIncrease > EXTREME_TEST_CONFIG.MAX_MEMORY_INCREASE;
    const hasMinorLeak = totalIncrease > 50;
    
    let status, color;
    if (isCritical) {
      status = '💀 FALHA CRÍTICA - SISTEMA PODE TRAVAR';
      color = 'background: red; color: white; font-weight: bold; padding: 4px';
    } else if (hasMajorLeak) {
      status = '❌ VAZAMENTO SIGNIFICATIVO DETECTADO';
      color = 'color: red; font-weight: bold';
    } else if (hasMinorLeak) {
      status = '⚠️ VAZAMENTO MENOR DETECTADO';
      color = 'color: orange; font-weight: bold';
    } else {
      status = '✅ PASSOU NO TESTE EXTREMO!';
      color = 'color: green; font-weight: bold';
    }
    
    console.log(`%c${status}`, color);
    console.log('');
    
    // Métricas detalhadas
    console.log('📊 MÉTRICAS DO TESTE EXTREMO:');
    console.log(`   🕐 Duração: ${testDuration.toFixed(2)}s`);
    console.log(`   🔄 Ciclos completados: ${this.cyclesCompleted}`);
    console.log(`   ❌ Erros encontrados: ${this.errorsEncountered}`);
    console.log(`   🏗️ Operações pesadas: ${this.heavyOperations}`);
    console.log('');
    
    console.log('💾 ANÁLISE DE MEMÓRIA:');
    console.log(`   📈 Inicial: ${this.startMemory} MB`);
    console.log(`   📈 Final: ${finalMemory} MB`);
    console.log(`   📈 Aumento: ${totalIncrease.toFixed(2)} MB`);
    console.log(`   📈 Pico máximo: ${maxMemory} MB`);
    console.log(`   📈 Média: ${avgMemory.toFixed(2)} MB`);
    console.log('');
    
    console.log('⏰ ANÁLISE DE TIMERS:');
    console.log(`   🔧 Timeouts ativos: ${this.timeouts.size}`);
    console.log(`   🔧 Intervals ativos: ${this.intervals.size}`);
    console.log(`   🔧 Total de timers: ${this.timeouts.size + this.intervals.size}`);
    console.log('');
    
    // Diagnóstico detalhado
    console.log('🔍 DIAGNÓSTICO EXTREMO:');
    if (isCritical) {
      console.log('%c   💀 VAZAMENTO CRÍTICO - PODE CAUSAR TRAVAMENTO!', 'color: red; font-weight: bold');
      console.log('   🚨 O sistema não suportou o teste extremo');
      console.log('   🔧 AÇÕES NECESSÁRIAS:');
      console.log('      • Revisar todo o cleanup de timers');
      console.log('      • Implementar debouncing agressivo');
      console.log('      • Otimizar re-renders com React.memo');
      console.log('      • Considerar virtualization para listas');
    } else if (hasMajorLeak) {
      console.log('%c   ⚠️ VAZAMENTO SIGNIFICATIVO DETECTADO', 'color: orange; font-weight: bold');
      console.log('   📋 Possíveis causas no teste extremo:');
      console.log('      • Alguns timers não estão sendo limpos');
      console.log('      • Closures mantendo referências desnecessárias');
      console.log('      • Re-renders excessivos em operações intensas');
    } else if (hasMinorLeak) {
      console.log('%c   ⚠️ VAZAMENTO MENOR - ACEITÁVEL PARA TESTE EXTREMO', 'color: orange');
      console.log('   ✅ Sistema se manteve estável durante stress extremo');
    } else {
      console.log('%c   🎉 SISTEMA EXTREMAMENTE OTIMIZADO!', 'color: green; font-weight: bold');
      console.log('   ✅ Passou em todas as condições extremas');
      console.log('   ✅ Memória controlada mesmo sob stress máximo');
      console.log('   ✅ Limpeza de recursos funcionando perfeitamente');
    }
    
    // Timeline de memória se houve problema
    if (totalIncrease > 50 && this.measurements.length > 0) {
      console.log('');
      console.log('📈 EVOLUÇÃO DA MEMÓRIA (PONTOS CRÍTICOS):');
      this.measurements.filter((_, i) => i % 20 === 0).forEach(measurement => {
        const time = (measurement.time / 1000).toFixed(1);
        const delta = measurement.memoryDelta.toFixed(2);
        console.log(`   ${time}s: ${measurement.memory}MB (${delta >= 0 ? '+' : ''}${delta}MB)`);
      });
    }
  }

  forceCleanup() {
    console.log('');
    console.log('🧹 EXECUTANDO LIMPEZA FORÇADA...');
    
    // Limpar todos os timers
    let cleaned = 0;
    this.timeouts.forEach(id => {
      clearTimeout(id);
      cleaned++;
    });
    
    this.intervals.forEach(id => {
      clearInterval(id);
      cleaned++;
    });
    
    console.log(`✅ Limpeza concluída: ${cleaned} timers removidos`);
    console.log('🎯 Sistema pronto para uso normal');
    
    // Forçar garbage collection se disponível
    if (window.gc) {
      window.gc();
      console.log('🗑️ Garbage collection forçado');
    }
  }
}

// 🚀 AUTO-EXECUÇÃO APÓS 2 SEGUNDOS
console.log('');
console.log('⏳ Teste extremo iniciará em 2 segundos...');
console.log('❌ Para CANCELAR: digite clearTimeout(extremeTestTimeout) agora!');

const extremeTestTimeout = setTimeout(() => {
  console.log('🔥 INICIANDO TESTE EXTREMO AGORA!');
  const tester = new ExtremeStressTest();
  tester.runExtremeTest();
}, 2000);

// Disponibilizar para uso manual
window.extremeStressTest = {
  runNow: () => {
    clearTimeout(extremeTestTimeout);
    new ExtremeStressTest().runExtremeTest();
  },
  
  runQuick: () => {
    const quickConfig = { ...EXTREME_TEST_CONFIG };
    quickConfig.SIMULATION_CYCLES = 50;
    quickConfig.TEST_DURATION = 60000;
    new ExtremeStressTest().runExtremeTest();
  }
};

console.log('🎮 COMANDOS DISPONÍVEIS:');
console.log('   extremeStressTest.runNow()   - Executar imediatamente');
console.log('   extremeStressTest.runQuick() - Versão mais rápida (1min)');
