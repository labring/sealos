import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  })
});

export const TemplateRepositorySchema = z.object({
  uid: z.string().openapi({
    description: 'Runtime ID'
  }),
  iconId: z.string().openapi({
    description: 'Runtime Icon'
  }),
  name: z.string().openapi({
    description: 'Runtime Name'
  }),
  kind: z.string().openapi({
    description: 'Runtime Kind'
  })
});

export const TemplateSchema = z.object({
  templateRepository: TemplateRepositorySchema,
  uid: z.string().openapi({
    description: 'Runtime Specific Version ID'
  }),
  image: z.string().openapi({
    description: 'Runtime Specific Version Image'
  }),
  name: z.string().openapi({
    description: 'Runtime Specific Version Name'
  })
});

export const PortInfoSchema = z.object({
  portName: z.string().openapi({
    description: 'Port Name'
  }),
  port: z.number().openapi({
    description: 'Port'
  }),
  protocol: z.string().openapi({
    description: 'Protocol'
  }),
  networkName: z.string().optional().openapi({
    description: 'Network Name'
  }),
  openPublicDomain: z.boolean().openapi({
    description: 'Open Public Domain'
  }),
  publicDomain: z.string().optional().openapi({
    description: 'Public Domain'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom Domain'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    name: z.string().openapi({
      description: 'Devbox name'
    }),
    templateID: z.string().openapi({
      description: 'Runtime Specific Version ID'
    }),
    templateRepositoryID: z.string().openapi({
      description: 'Runtime ID'
    }),
    templateRepositoryName: z.string().openapi({
      description: 'Runtime Name'
    }),
    templateRepositoryIcon: z.string().openapi({
      description: 'Runtime Icon'
    }),
    templateRepositoryKind: z.string().openapi({
      description: 'Runtime Kind'
    }),
    templateImage: z.string().openapi({
      description: 'Runtime Specific Version Image'
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
      .optional()
      .openapi({
        description: 'GPU'
      }),
    status: z.string().openapi({
      description: 'Status'
    }),
    portInfos: z.array(PortInfoSchema).openapi({
      description: 'Port Infos'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  error: z.string()
});
