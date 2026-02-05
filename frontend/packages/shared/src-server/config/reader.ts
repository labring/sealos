import type { z } from 'zod';
import type { ConfigResult } from './types';

/**
 * Read and validate configuration from a text string.
 * Defaults to YAML parsing if parser is not provided.
 *
 * @returns frozen readonly config.
 */
export async function readConfig<T extends z.ZodType>(
  text: string,
  schema: T,
  parser?: (text: string) => unknown
): Promise<ConfigResult<z.output<ReturnType<T['readonly']>>>> {
  try {
    let parsed: unknown;

    if (parser) {
      parsed = parser(text);
    } else {
      // Default to YAML parsing
      const yaml = await import('js-yaml');
      parsed = yaml.load(text);
    }

    // Use readonly schema to ensure deep readonly types and runtime immutability
    const readonlySchema = schema.readonly();
    const result = readonlySchema.safeParse(parsed);

    if (!result.success) {
      return {
        error: {
          message: 'Configuration validation failed',
          details: result.error
        }
      };
    }

    const config = result.data as z.output<ReturnType<T['readonly']>>;

    return {
      data: config
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      error: {
        message: `Failed to parse configuration: ${error.message}`,
        details: error
      }
    };
  }
}
