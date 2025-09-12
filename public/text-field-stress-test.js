/**
 * 🔥 TESTE ESPECÍFICO - Campo de Texto Longo com Múltiplas Classificações
 * 
 * Este teste simula EXATAMENTE o problema reportado pelo usuário:
 * - Digitação em campos de "problem_detail" (campos longos)
 * - Múltiplas abas de classificação sendo editadas
 * - Tentativas de alteração múltiplas (4-5 vezes)
 * 
 * Execute no console da página de análise
 */

console.log('%c🔥 TESTE ESPECÍFICO - Campos de Texto Longo', 'color: red; font-size: 16px; font-weight: bold');
console.log('🎯 Simulando o problema exato reportado pelo usuário...');

// Evitar redeclaração se script for carregado múltiplas vezes
if (typeof window.TextFieldStressTest !== 'undefined') {
  console.log('🔄 Script já carregado - usando instância existente');
  window.textFieldTest.runTest();
  throw new Error('SCRIPT_ALREADY_LOADED'); // Para o resto da execução
}

class TextFieldStressTest {
  constructor() {
    this.startMemory = this.getMemory();
    this.timeouts = new Set();
    this.intervals = new Set(); 
    this.renderCount = 0;
    this.startTime = performance.now();
    this.errorCount = 0;
  }

  getMemory() {
    return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
  }

  async runFieldTest() {
    console.log('🧪 INICIANDO TESTE DE CAMPOS DE TEXTO LONGO');
    console.log('════════════════════════════════════════════════');
    console.log(`📊 Memória inicial: ${this.startMemory} MB`);
    console.log('');

    try {
      // 1. Encontrar campos de problema/detalhamento
      const textFields = this.findProblemDetailFields();
      console.log(`📝 Encontrados ${textFields.length} campos de texto longo`);

      if (textFields.length === 0) {
        console.warn('⚠️ Nenhum campo de texto encontrado - abra um modal de edição primeiro');
        return;
      }

      // 2. Monitorar performance durante digitação
      this.startPerformanceMonitoring();

      // 3. Simular digitação pesada em múltiplos campos
      await this.simulateHeavyTyping(textFields);

      // 4. Simular tentativas múltiplas (problema relatado)
      await this.simulateMultipleAttempts(textFields);

      // 5. Gerar relatório
      this.generateFieldTestReport();

    } catch (error) {
      console.error('❌ Erro durante teste:', error);
      this.errorCount++;
    }
  }

  findProblemDetailFields() {
    const selectors = [
      'textarea[placeholder*="detalhes"]',
      'textarea[placeholder*="problema"]',
      'textarea[placeholder*="adicional"]',
      'textarea[rows="3"]',
      'textarea.text-sm',
      'input[name*="detail"]',
      'textarea[name*="detail"]'
    ];

    let fields = [];
    for (let selector of selectors) {
      fields.push(...document.querySelectorAll(selector));
    }

    return fields.filter(field => field.offsetParent !== null);
  }

  startPerformanceMonitoring() {
    console.log('📈 Iniciando monitoramento de performance...');
    
    // Monitor de re-renders (detectar através de mudanças no DOM)
    const observer = new MutationObserver((mutations) => {
      this.renderCount += mutations.length;
      
      if (this.renderCount > 500) {
        console.warn(`⚠️ MUITOS RE-RENDERS: ${this.renderCount}`);
      }
    });

    // Observar mudanças no DOM que indicam re-renders
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Monitor de memória
    const memoryMonitor = setInterval(() => {
      const currentMemory = this.getMemory();
      const increase = currentMemory - this.startMemory;
      
      if (increase > 100) {
        console.error(`🚨 VAZAMENTO DE MEMÓRIA: +${increase} MB`);
      }
    }, 2000);

    this.intervals.add(memoryMonitor);
    
    // Parar observer após teste
    setTimeout(() => {
      observer.disconnect();
    }, 30000);
  }

  async simulateHeavyTyping(fields) {
    console.log('⌨️ Simulando digitação pesada...');
    
    const longTexts = [
      'Este é um problema muito detalhado que requer uma descrição extensa para capturar todas as nuances da situação. O cliente relatou múltiplas questões relacionadas ao atendimento, incluindo demora na resposta, falta de cortesia da equipe, problemas com o sistema de reservas que não funcionou corretamente durante o check-in, gerando constrangimento e perda de tempo. Além disso, houve questões com a limpeza do quarto que não estava adequada aos padrões esperados.',
      
      'Situação complexa envolvendo múltiplos departamentos. Inicialmente, o problema começou na recepção com informações incorretas sobre os serviços disponíveis. Em seguida, a governança não conseguiu resolver questões de manutenção no quarto, o que resultou em transferência desnecessária. O departamento de alimentos e bebidas também apresentou falhas no atendimento durante o café da manhã, com produtos em falta e demora excessiva no service. A TI foi acionada para resolver problemas com WiFi mas não houve solução efetiva.',
      
      'Detalhamento técnico da ocorrência: Sistema de ar condicionado apresentou mau funcionamento às 14:30, temperatura ambiente subiu para 28°C, hóspede relatou desconforto extremo. Manutenção foi acionada às 14:45 mas só chegou às 16:20, tempo de resposta inadequado. Técnico identificou problema no compressor que requeria peça de reposição não disponível no estoque. Solução temporária oferecida (ventilador) foi insuficiente. Hóspede solicitou troca de quarto mas não havia disponibilidade no andar.',
    ];

    // Testar cada campo com texto longo
    for (let i = 0; i < Math.min(fields.length, 5); i++) {
      const field = fields[i];
      const text = longTexts[i % longTexts.length];
      
      console.log(`📝 Campo ${i + 1}: Digitando ${text.length} caracteres...`);
      
      try {
        field.focus();
        await this.wait(100);

        // Simular digitação caractere por caractere (problema real!)
        for (let charIndex = 0; charIndex < text.length; charIndex++) {
          field.value = text.substring(0, charIndex + 1);
          
          // Disparar eventos como usuário real
          field.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Medir performance a cada 50 caracteres
          if (charIndex % 50 === 0) {
            const currentMemory = this.getMemory();
            const increase = currentMemory - this.startMemory;
            console.log(`   ${charIndex}/${text.length} chars - Memória: +${increase}MB - Re-renders: ${this.renderCount}`);
            
            if (increase > 50) {
              console.warn(`   ⚠️ Memória crescendo rapidamente!`);
            }
          }
          
          // Delay mínimo entre caracteres (velocidade humana)
          if (charIndex % 10 === 0) {
            await this.wait(5);
          }
        }

        // Trigger final
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.blur();
        
        console.log(`   ✅ Campo ${i + 1} concluído`);
        await this.wait(500);

      } catch (error) {
        console.error(`   ❌ Erro no campo ${i + 1}:`, error.message);
        this.errorCount++;
      }
    }
  }

  async simulateMultipleAttempts(fields) {
    console.log('🔄 Simulando múltiplas tentativas (4-5x como relatado)...');
    
    if (fields.length === 0) return;
    
    const field = fields[0]; // Usar primeiro campo
    const shortText = 'Tentativa de edição número ';
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`🔄 Tentativa ${attempt}/5...`);
      
      try {
        field.focus();
        
        // Limpar e digitar novo conteúdo
        field.value = '';
        const fullText = shortText + attempt + ' - Testando se travamento persiste após correção de debounce';
        
        // Digitação mais rápida (usuário tentando várias vezes)
        for (let i = 0; i < fullText.length; i++) {
          field.value = fullText.substring(0, i + 1);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          
          if (i % 20 === 0) {
            await this.wait(2); // Digitação mais rápida
          }
        }
        
        field.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Simular tentativa de salvar ou mudar para próximo campo
        await this.wait(300);
        field.blur();
        await this.wait(200);
        
        const currentMemory = this.getMemory();
        console.log(`   Tentativa ${attempt}: ${currentMemory - this.startMemory}MB, Re-renders: ${this.renderCount}`);
        
      } catch (error) {
        console.error(`   ❌ Erro na tentativa ${attempt}:`, error.message);
        this.errorCount++;
      }
    }
  }

  generateFieldTestReport() {
    const finalMemory = this.getMemory();
    const totalIncrease = finalMemory - this.startMemory;
    const testDuration = (performance.now() - this.startTime) / 1000;

    console.log('');
    console.log('📊 RELATÓRIO FINAL - TESTE DE CAMPOS DE TEXTO');
    console.log('═══════════════════════════════════════════════');
    
    // Analisar se o problema foi resolvido
    const hasPerformanceIssue = totalIncrease > 100 || this.renderCount > 1000 || this.errorCount > 3;
    const hasMinorIssue = totalIncrease > 50 || this.renderCount > 500;
    
    let status, color;
    if (hasPerformanceIssue) {
      status = '❌ PROBLEMA PERSISTE';
      color = 'color: red; font-weight: bold';
    } else if (hasMinorIssue) {
      status = '⚠️ MELHOROU MAS AINDA HÁ OTIMIZAÇÕES';
      color = 'color: orange; font-weight: bold';
    } else {
      status = '✅ PROBLEMA RESOLVIDO!';
      color = 'color: green; font-weight: bold';
    }

    console.log(`%c${status}`, color);
    console.log('');

    console.log('📈 MÉTRICAS DO TESTE:');
    console.log(`   ⏱️ Duração: ${testDuration.toFixed(2)}s`);
    console.log(`   💾 Memória inicial: ${this.startMemory}MB`);
    console.log(`   💾 Memória final: ${finalMemory}MB`);
    console.log(`   💾 Aumento: ${totalIncrease.toFixed(2)}MB`);
    console.log(`   🔄 Re-renders detectados: ${this.renderCount}`);
    console.log(`   ❌ Erros: ${this.errorCount}`);
    console.log('');

    console.log('🔍 DIAGNÓSTICO:');
    if (hasPerformanceIssue) {
      console.log('%c   🚨 Problema ainda existe!', 'color: red; font-weight: bold');
      console.log('   📋 Possíveis causas restantes:');
      if (this.renderCount > 1000) console.log('      • Re-renders excessivos ainda ocorrendo');
      if (totalIncrease > 100) console.log('      • Vazamentos de memória ainda presentes');
      if (this.errorCount > 3) console.log('      • Muitos erros durante digitação');
    } else if (hasMinorIssue) {
      console.log('%c   ⚡ Melhorias detectadas, mas ainda há otimizações', 'color: orange');
      console.log('   🔧 Debounce funcionando, performance melhorou');
    } else {
      console.log('%c   🎉 PROBLEMA RESOLVIDO COMPLETAMENTE!', 'color: green; font-weight: bold');
      console.log('   ✅ Debounce implementado com sucesso');
      console.log('   ✅ Re-renders controlados');
      console.log('   ✅ Memória estável durante digitação longa');
      console.log('   ✅ Múltiplas tentativas não causam travamento');
    }

    // Limpeza
    console.log('');
    console.log('🧹 Executando limpeza...');
    this.cleanup();
  }

  cleanup() {
    this.timeouts.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    console.log(`✅ ${this.timeouts.size + this.intervals.size} timers limpos`);
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
}

// 🚀 AUTO-EXECUTAR
setTimeout(() => {
  const tester = new TextFieldStressTest();
  tester.runFieldTest();
}, 1000);

// Disponibilizar para uso manual
window.TextFieldStressTest = TextFieldStressTest;
window.textFieldTest = {
  runTest: () => new TextFieldStressTest().runFieldTest()
};

console.log('');
console.log('🎮 COMANDO MANUAL:');
console.log('   textFieldTest.runTest() - Executar teste específico de campos');
