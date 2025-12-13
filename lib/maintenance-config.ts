// Configuração de manutenção do sistema
// Para ativar o modo manutenção, altere MAINTENANCE_MODE para true
// Para desativar, altere para false

export const MAINTENANCE_CONFIG = {

  MAINTENANCE_MODE: false,
  
  // Mensagens personalizáveis
  TITLE: 'Sistema em Manutenção',
  SUBTITLE: 'BI Qualidade • Grupo Wish',
  MAIN_MESSAGE: 'Estamos aprimorando nossa plataforma',
  DESCRIPTION: 'Nossa equipe está trabalhando para trazer melhorias e novas funcionalidades para o sistema de Business Intelligence. Durante este período, todas as funcionalidades estão temporariamente indisponíveis.',
  
  // Informações de contato
  SUPPORT_EMAIL: 'expifiap1@gmail.com',
  SUPPORT_PHONE: '(11) 94022-4459',

  
  // Configurações visuais
  SHOW_CURRENT_TIME: true,
  SHOW_CONTACT_INFO: true,
  SHOW_ANIMATED_EFFECTS: true,
  
  // Previsão de retorno (opcional)
  ESTIMATED_RETURN: null, // Pode ser uma data: new Date('2024-01-15T10:00:00')
  
  // IPs ou usuários que podem acessar mesmo em manutenção (opcional)
  WHITELIST_IPS: [] as string[],
  WHITELIST_EMAILS: [] as string[],
};

// Função para verificar se deve mostrar a página de manutenção
export function shouldShowMaintenance(userEmail?: string, userIP?: string): boolean {
  if (!MAINTENANCE_CONFIG.MAINTENANCE_MODE) {
    return false;
  }
  
  // Verificar whitelist de emails
  if (userEmail && MAINTENANCE_CONFIG.WHITELIST_EMAILS.includes(userEmail)) {
    return false;
  }
  
  // Verificar whitelist de IPs
  if (userIP && MAINTENANCE_CONFIG.WHITELIST_IPS.includes(userIP)) {
    return false;
  }
  
  return true;
}

// Função para obter a mensagem de status
export function getMaintenanceStatus(): string {
  if (MAINTENANCE_CONFIG.ESTIMATED_RETURN) {
    const now = new Date();
    const returnTime = new Date(MAINTENANCE_CONFIG.ESTIMATED_RETURN);
    
    if (returnTime > now) {
      const diffMs = returnTime.getTime() - now.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 24) {
        return `Previsão de retorno: ${diffHours}h`;
      } else {
        const diffDays = Math.ceil(diffHours / 24);
        return `Previsão de retorno: ${diffDays} dia(s)`;
      }
    }
  }
  
  return 'Manutenção Programada';
}
