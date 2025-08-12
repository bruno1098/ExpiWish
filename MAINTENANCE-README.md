# 🔧 Sistema de Manutenção - ExpiWish

Este documento explica como usar o sistema de manutenção implementado na plataforma BI Qualidade do Grupo Wish.

## 📋 Visão Geral

O sistema de manutenção permite bloquear completamente o acesso à aplicação, exibindo uma página de manutenção elegante e animada para todos os usuários, independentemente de estarem logados ou não.

## 🚀 Como Ativar/Desativar a Manutenção

### Método 1: Arquivo de Configuração (Recomendado)

Edite o arquivo `lib/maintenance-config.ts`:

```typescript
export const MAINTENANCE_CONFIG = {
  // Para ATIVAR a manutenção
  MAINTENANCE_MODE: true,
  
  // Para DESATIVAR a manutenção
  // MAINTENANCE_MODE: false,
  
  // ... outras configurações
};
```

### Método 2: Variável de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Para ativar manutenção
NEXT_PUBLIC_MAINTENANCE_MODE=true

# Para desativar manutenção
# NEXT_PUBLIC_MAINTENANCE_MODE=false
```

## ⚙️ Configurações Disponíveis

No arquivo `lib/maintenance-config.ts`, você pode personalizar:

### Mensagens
- `TITLE`: Título principal da página
- `SUBTITLE`: Subtítulo (ex: "BI Qualidade • Grupo Wish")
- `MAIN_MESSAGE`: Mensagem principal animada
- `DESCRIPTION`: Descrição detalhada da manutenção

### Contato
- `SUPPORT_EMAIL`: Email de suporte
- `SUPPORT_PHONE`: Telefone de suporte

### Funcionalidades Visuais
- `SHOW_CURRENT_TIME`: Mostrar horário atual (true/false)
- `SHOW_CONTACT_INFO`: Mostrar informações de contato (true/false)
- `SHOW_ANIMATED_EFFECTS`: Mostrar efeitos animados (true/false)

### Previsão de Retorno
- `ESTIMATED_RETURN`: Data estimada de retorno (opcional)

```typescript
// Exemplo com data de retorno
ESTIMATED_RETURN: new Date('2024-01-15T10:00:00')
```

### Whitelist (Acesso Especial)
- `WHITELIST_IPS`: IPs que podem acessar mesmo em manutenção
- `WHITELIST_EMAILS`: Emails que podem acessar mesmo em manutenção

```typescript
// Exemplo de whitelist
WHITELIST_IPS: ['192.168.1.100', '10.0.0.5'],
WHITELIST_EMAILS: ['admin@grupoWish.com.br', 'dev@grupoWish.com.br']
```

## 🎨 Características da Página de Manutenção

### Design
- ✨ Gradientes nas cores da marca (azul, roxo, rosa)
- 🌟 Animações suaves e efeitos de partículas
- 📱 Totalmente responsiva
- 🌙 Suporte a tema escuro/claro
- ⚡ Efeitos de blur e backdrop

### Funcionalidades
- 🕐 Relógio em tempo real
- 📊 Status da manutenção
- 📞 Informações de contato
- ⏰ Previsão de retorno (opcional)
- 🔄 Indicadores de carregamento animados

## 🔒 Como Funciona o Bloqueio

Quando ativado, o sistema:

1. **Intercepta todas as rotas** no layout principal
2. **Substitui todo o conteúdo** pela página de manutenção
3. **Funciona para usuários logados e não logados**
4. **Mantém a autenticação** (quando a manutenção for desativada, usuários continuam logados)
5. **Respeita whitelists** (se configuradas)

## 🚨 Cenários de Uso

### Manutenção Programada
```typescript
MAINTENANCE_MODE: true,
MAIN_MESSAGE: 'Manutenção programada em andamento',
ESTIMATED_RETURN: new Date('2024-01-15T06:00:00')
```

### Atualização de Sistema
```typescript
MAINTENANCE_MODE: true,
MAIN_MESSAGE: 'Atualizando sistema para nova versão',
DESCRIPTION: 'Estamos implementando novas funcionalidades...'
```

### Emergência
```typescript
MAINTENANCE_MODE: true,
MAIN_MESSAGE: 'Sistema temporariamente indisponível',
SHOW_CONTACT_INFO: true,
WHITELIST_EMAILS: ['admin@grupoWish.com.br']
```

## 📝 Checklist de Ativação

Antes de ativar a manutenção:

- [ ] Verificar se todas as configurações estão corretas
- [ ] Testar a página de manutenção em desenvolvimento
- [ ] Comunicar aos usuários sobre a manutenção
- [ ] Configurar whitelist se necessário
- [ ] Definir previsão de retorno (se aplicável)
- [ ] Verificar informações de contato

## 🔄 Processo de Deploy

1. **Desenvolvimento**: Teste com `MAINTENANCE_MODE: true`
2. **Comunicação**: Avise os usuários
3. **Ativação**: Altere a configuração e faça deploy
4. **Monitoramento**: Verifique se está funcionando
5. **Desativação**: Altere para `false` quando concluído

## 🆘 Troubleshooting

### Página não aparece
- Verifique se `MAINTENANCE_MODE: true`
- Confirme se não há cache do browser
- Verifique se o deploy foi realizado

### Usuários específicos não conseguem acessar
- Verifique a whitelist de emails/IPs
- Confirme se a função `shouldShowMaintenance()` está funcionando

### Problemas de estilo
- Verifique se o Tailwind CSS está funcionando
- Confirme se não há conflitos de CSS

## 📞 Suporte

Em caso de problemas com o sistema de manutenção:
- Email: dev@grupoWish.com.br
- Documentação técnica: Este arquivo
- Logs: Verifique o console do navegador e logs do servidor

---

**Nota**: Este sistema foi projetado para ser simples e eficaz. Sempre teste em ambiente de desenvolvimento antes de ativar em produção.