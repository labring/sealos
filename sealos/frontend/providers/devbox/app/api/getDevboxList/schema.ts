import 'zod-openapi/extend';
import { z } from 'zod';

export const DevboxListItemSchema = z.object({
  name: z.string().openapi({
    description: 'Devbox name'
  }),
  uid: z.string().openapi({
    description: 'Devbox UID'
  }),
  createTime: z.string().openapi({
    description: 'Creation time'
  }),
  status: z.string().openapi({
    description: 'Status'
  }),
  templateUid: z.string().openapi({
    description: 'Template UID'
  }),
  cpu: z.number().openapi({
    description: 'CPU'
  }),
  memory: z.number().openapi({
    description: 'Memory'
  }),
  gpu: z
    .object({
      manufacturers: z.string(),
      type: z.string(),
      amount: z.number()
    })
    .optional(),
  networks: z.array(
    z.object({
      networkName: z.string().openapi({
        description: 'Network name'
      }),
      portName: z.string().openapi({
        description: 'Port name'
      }),
      port: z.number().openapi({
        description: 'Port'
      }),
      protocol: z.string().openapi({
        description: 'Protocol'
      }),
      openPublicDomain: z.boolean().openapi({
        description: 'Open public domain'
      }),
      publicDomain: z.string().openapi({
        description: 'Public domain'
      }),
      customDomain: z.string().openapi({
        description: 'Custom domain'
      })
    })
  )
});

export const ResponseSchema = z.object({
  data: z.array(DevboxListItemSchema)
});
