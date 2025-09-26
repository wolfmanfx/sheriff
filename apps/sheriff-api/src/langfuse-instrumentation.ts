/**
 * Langfuse OpenTelemetry Instrumentation
 * Initializes OpenTelemetry with LangfuseExporter to enable
 * automatic tracing of LLM calls made through the Vercel AI SDK.
 */
import { LangfuseExporter } from 'langfuse-vercel';
import { registerOTel } from '@vercel/otel';

/**
 * Initialize OpenTelemetry SDK with Langfuse integration
 * This should be called before any other application code runs
 */
export function register(): void {
  // Only initialize if Langfuse credentials are provided
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    console.log('[Langfuse] Skipping instrumentation - credentials not provided');
    return;
  }

  registerOTel({
    serviceName: 'sheriff-api',
    traceExporter: new LangfuseExporter({
      environment: process.env.NODE_ENV || 'development',
    }),
  });

  console.log('[Langfuse] Instrumentation initialized');
}





