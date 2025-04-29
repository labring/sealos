import 'zod-openapi/extend';
import { z } from 'zod';

export const DevboxListItemSchema = z.object({
  name: z.string().openapi({
    description: 'Devbox name'
  }),
  id: z.string().openapi({
    description: 'Devbox UID'
  }),
  runtimeId: z.string().openapi({
    description: 'Runtime UID'
  }),
  runtimeName: z.string().openapi({
    description: 'Runtime name'
  }),
  createTime: z.string().openapi({
    description: 'Creation time'
  }),
  status: z.string().openapi({
    description: 'Status'
  }),
  cpu: z.number().openapi({
    description: 'CPU'
  }),
  memory: z.number().openapi({
    description: 'Memory'
  })
});

export const ResponseSchema = z.object({
  data: z.array(DevboxListItemSchema)
});
