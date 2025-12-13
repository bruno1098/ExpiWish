const MANUAL_OPENAI_KEY = '';

/**
 * Centraliza a resolução da chave da OpenAI.
 * - Para testes locais sem .env, preencha MANUAL_OPENAI_KEY.
 * - Em produção use OPENAI_API_KEY via variáveis de ambiente.
 */
export const openaiConfig = {
  apiKey: (process.env.OPENAI_API_KEY || MANUAL_OPENAI_KEY || '').trim()
};

export const getOpenAIApiKey = () => openaiConfig.apiKey;
