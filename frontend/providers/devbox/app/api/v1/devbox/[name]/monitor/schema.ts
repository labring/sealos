import 'zod-openapi/extend';
import { z } from 'zod';

// Monitor data point schema
export const MonitorDataPoint = z.object({
  timestamp: z.number().openapi({
    description: 'Unix timestamp in seconds',
    example: 1760510280
  }),
  readableTime: z.string().openapi({
    description: 'Human-readable time format (YYYY/MM/DD HH:mm)',
    example: '2025/10/15 14:38'
  }),
  cpu: z.number().openapi({
    description: 'CPU usage percentage',
    example: 1.08
  }),
  memory: z.number().openapi({
    description: 'Memory usage percentage',
    example: 10.32
  })
}).openapi({
  title: 'Monitor Data Point',
  description: 'Single data point containing resource usage metrics'
});

// Success response schema
export const MonitorSuccessResponseSchema = z.array(MonitorDataPoint).openapi({
  title: 'Monitor Success Response',
  description: 'Array of monitor data points ordered by timestamp. Returns empty array if no data is available.',
  example: [
    {
      timestamp: 1760510280,
      readableTime: '2025/10/15 14:38',
      cpu: 1.08,
      memory: 10.32
    },
    {
      timestamp: 1760510340,
      readableTime: '2025/10/15 14:39',
      cpu: 1.18,
      memory: 10.37
    }
  ]
});

