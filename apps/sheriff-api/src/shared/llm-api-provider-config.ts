/**
 * LLM API Provider Configuration
 * Handles configuration and creation of language model instances from various providers
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

export type ProviderType = 'lm-studio' | 'openai' | 'anthropic' | 'gemini';

export interface ProviderConfig {
  type: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface ProviderEnvConfig {
  apiKeyEnv?: string;
  baseUrlEnv?: string;
  modelEnv?: string;
  defaultBaseUrl?: string;
  defaultModel: string;
  requiresApiKey: boolean;
}

const PROVIDER_CONFIGS: Record<ProviderType, ProviderEnvConfig> = {
  'lm-studio': {
    baseUrlEnv: 'LM_STUDIO_BASE_URL',
    apiKeyEnv: 'LM_STUDIO_API_KEY',
    modelEnv: 'LM_STUDIO_CHAT_MODEL',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: false,
  },
  anthropic: {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-3-5-haiku-latest',
    requiresApiKey: true,
  },
  openai: {
    baseUrlEnv: 'OPENAI_BASE_URL',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    requiresApiKey: true,
  },
  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.5-flash',
    requiresApiKey: true,
  },
};

/**
 * Get provider configuration from environment variables
 */
export function getProviderConfigFromEnv(): ProviderConfig {
  const providerType =
    (process.env.MODEL_PROVIDER as ProviderType) || 'lm-studio';

  const providerConfig = PROVIDER_CONFIGS[providerType];
  if (!providerConfig) {
    throw new Error(`Unsupported provider type: ${providerType}`);
  }

  const config: ProviderConfig = { type: providerType };

  if (providerConfig.baseUrlEnv) {
    config.baseUrl = process.env[providerConfig.baseUrlEnv] || providerConfig.defaultBaseUrl;
  }

  if (providerConfig.apiKeyEnv) {
    config.apiKey = process.env[providerConfig.apiKeyEnv];
    if (providerConfig.requiresApiKey && !config.apiKey) {
      throw new Error(
        `${providerConfig.apiKeyEnv} environment variable is required when using ${providerType} provider`,
      );
    }
  }

  config.model = providerConfig.modelEnv
    ? process.env[providerConfig.modelEnv] || providerConfig.defaultModel
    : providerConfig.defaultModel;

  return config;
}

/**
 * Create a language model instance from provider configuration
 * Supports Anthropic, Gemini, OpenAI, and OpenAI-compatible providers (LM Studio, etc.)
 */
export function createModelFromProviderConfig(config?: ProviderConfig): LanguageModel {
  const providerConfig = config || getProviderConfigFromEnv();

  switch (providerConfig.type) {
    case 'anthropic': {
      const provider = createAnthropic({ apiKey: providerConfig.apiKey });
      return provider.chat(providerConfig.model || PROVIDER_CONFIGS.anthropic.defaultModel);
    }

    case 'gemini': {
      const provider = createGoogleGenerativeAI({ apiKey: providerConfig.apiKey });
      return provider.chat(providerConfig.model || PROVIDER_CONFIGS.gemini.defaultModel);
    }

    case 'openai':
    case 'lm-studio': {
      const providerEnvConfig = PROVIDER_CONFIGS[providerConfig.type];
      const provider = createOpenAICompatible({
        baseURL: providerConfig.baseUrl || providerEnvConfig.defaultBaseUrl!,
        apiKey: providerConfig.apiKey,
        name: providerConfig.type === 'openai' ? 'openai' : 'lmstudio',
      });
      return provider.chatModel(providerConfig.model || providerEnvConfig.defaultModel);
    }

    default:
      throw new Error(`Unsupported provider type: ${providerConfig.type}`);
  }
}

