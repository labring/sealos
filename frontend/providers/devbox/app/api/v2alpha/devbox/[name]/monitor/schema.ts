import 'zod-openapi/extend';
import { z } from 'zod';

export const MonitorQuerySchema = z
  .object({
    start: z
      .string()
      .optional()
      .openapi({
        description: 'Range starting timestamp (seconds since epoch)',
        example: '1760506680'
      }),
    end: z
      .string()
      .optional()
      .openapi({
        description: 'Range ending timestamp (seconds since epoch)',
        example: '1760510280'
      }),
    step: z
      .string()
      .optional()
      .default('2m')
      .openapi({
        description: 'Sampling interval supported by VictoriaMetrics',
        example: '2m'
      })
  })
  .openapi({
    description: 'Query parameters for fetching devbox monitor timeline data'
  });

export const MonitorDataPointSchema = z.object({
  timestamp: z.number().openapi({
    description: 'Unix timestamp in seconds',
    example: 1760510280
  }),
  readableTime: z.string().openapi({
    description: 'Formatted timestamp in YYYY/MM/DD HH:mm',
    example: '2025/10/15 14:38'
  }),
  cpu: z.number().openapi({
    description: 'CPU utilisation percentage',
    example: 1.08
  }),
  memory: z.number().openapi({
    description: 'Memory utilisation percentage',
    example: 10.32
  })
});

export const GetSuccessResponseSchema = z
  .array(MonitorDataPointSchema)
  .openapi({
    description: 'Chronological sequence of devbox CPU and memory usage'
  });

export const MonitorSuccessResponseSchema = GetSuccessResponseSchema;

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
